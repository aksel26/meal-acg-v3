-- Push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_member_id ON public.push_subscriptions(member_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
