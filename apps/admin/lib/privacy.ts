export const MEMBER_LIST_SELECT = [
  "id",
  "login_id",
  "full_name",
  "role",
  "admin_role",
  "user_authority",
  "member_role",
  "team_id",
  "division_id",
  "organization_id",
  "position_id",
  "title_id",
  "intern_months",
  "teams(name)",
].join(", ");

export const MEMBER_DETAIL_SELECT = [
  "id",
  "login_id",
  "full_name",
  "role",
  "admin_role",
  "user_authority",
  "member_role",
  "hire_date",
  "email",
  "team_id",
  "division_id",
  "organization_id",
  "position_id",
  "title_id",
  "intern_months",
  "team:teams(name)",
  "position:positions(name)",
  "division:divisions(name)",
].join(", ");

export const MEMBER_SENSITIVE_SELECT = [
  "id",
  "full_name",
  "birth_date",
  "phone",
  "passport_number",
].join(", ");

export const ORGANIZATION_MEMBER_SELECT =
  "id, full_name, member_role, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name)";

export function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function assertNoSensitiveMemberFields(row: Record<string, unknown>) {
  const forbidden = ["password", "passport_number", "birth_date", "phone"];
  const leaked = forbidden.filter((field) => field in row);
  if (leaked.length > 0) {
    throw new Error(`Sensitive member fields leaked: ${leaked.join(", ")}`);
  }
}
