import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: restored, error } = await createCareersServiceClient().rpc(
    "restore_application",
    { p_application_id: uuid(id), p_actor_id: admin.id },
  );
  throwIfError(error);
  return data(restored);
});
