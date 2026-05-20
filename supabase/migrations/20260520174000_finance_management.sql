-- Finance management domain for admin operations.

CREATE TABLE IF NOT EXISTS public.finance_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  business_registration_number text,
  representative_name text,
  contact_name text,
  contact_phone text,
  contact_email text,
  payment_terms text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.finance_clients(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  contract_start_date date,
  contract_end_date date,
  contract_amount integer NOT NULL DEFAULT 0 CHECK (contract_amount >= 0),
  owner_member_id uuid REFERENCES public.members(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'paused', 'canceled')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.finance_clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.finance_projects(id) ON DELETE SET NULL,
  quote_no text NOT NULL UNIQUE,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal_amount integer NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  tax_amount integer NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount integer NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  approved_by uuid REFERENCES public.members(id),
  approved_at timestamptz,
  sent_at timestamptz,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.finance_quotes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  quantity numeric(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price integer NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  supply_amount integer NOT NULL DEFAULT 0 CHECK (supply_amount >= 0),
  tax_amount integer NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount integer NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.finance_revenue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.finance_clients(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.finance_projects(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.finance_quotes(id) ON DELETE SET NULL,
  revenue_month text NOT NULL CHECK (revenue_month ~ '^[0-9]{4}-[0-9]{2}$'),
  revenue_date date,
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  tax_invoice_status text NOT NULL DEFAULT 'none'
    CHECK (tax_invoice_status IN ('none', 'scheduled', 'issued')),
  expected_payment_date date,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'expected'
    CHECK (status IN ('expected', 'invoiced', 'paid', 'overdue', 'canceled')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_expense_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.finance_projects(id) ON DELETE RESTRICT,
  requester_id uuid REFERENCES public.members(id),
  expense_type text NOT NULL CHECK (char_length(trim(expense_type)) > 0),
  used_at date NOT NULL DEFAULT CURRENT_DATE,
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected')),
  approved_by uuid REFERENCES public.members(id),
  approved_at timestamptz,
  paid_at timestamptz,
  reject_reason text,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_table text NOT NULL
    CHECK (related_table IN ('finance_quotes', 'finance_revenue_records', 'finance_expense_records')),
  related_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  uploaded_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_clients_status_name
  ON public.finance_clients(status, name);
CREATE INDEX IF NOT EXISTS idx_finance_projects_client_status
  ON public.finance_projects(client_id, status, contract_end_date);
CREATE INDEX IF NOT EXISTS idx_finance_projects_owner_status
  ON public.finance_projects(owner_member_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_quotes_client_status
  ON public.finance_quotes(client_id, status, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_quotes_project
  ON public.finance_quotes(project_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_quote_items_quote_order
  ON public.finance_quote_items(quote_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_finance_revenue_month_status
  ON public.finance_revenue_records(revenue_month, status);
CREATE INDEX IF NOT EXISTS idx_finance_revenue_client_project
  ON public.finance_revenue_records(client_id, project_id, revenue_month);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_project_status
  ON public.finance_expense_records(project_id, status, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_requester
  ON public.finance_expense_records(requester_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_attachments_related
  ON public.finance_attachments(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_entity
  ON public.finance_audit_logs(entity_type, entity_id, created_at DESC);

CREATE OR REPLACE TRIGGER update_finance_clients_updated_at
  BEFORE UPDATE ON public.finance_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_finance_projects_updated_at
  BEFORE UPDATE ON public.finance_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_finance_quotes_updated_at
  BEFORE UPDATE ON public.finance_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_finance_revenue_updated_at
  BEFORE UPDATE ON public.finance_revenue_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_finance_expenses_updated_at
  BEFORE UPDATE ON public.finance_expense_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.finance_clients
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_projects
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_quotes
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_quote_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_revenue_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_expense_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_attachments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.finance_audit_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.finance_clients TO service_role;
GRANT ALL ON public.finance_projects TO service_role;
GRANT ALL ON public.finance_quotes TO service_role;
GRANT ALL ON public.finance_quote_items TO service_role;
GRANT ALL ON public.finance_revenue_records TO service_role;
GRANT ALL ON public.finance_expense_records TO service_role;
GRANT ALL ON public.finance_attachments TO service_role;
GRANT ALL ON public.finance_audit_logs TO service_role;

NOTIFY pgrst, 'reload schema';
