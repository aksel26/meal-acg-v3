import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: application, error } = await createCareersServiceClient().rpc(
    "clear_application_final_result",
    {
      p_application_id: uuid(id),
      p_actor_id: admin.id,
    },
  );
  throwIfError(error);
  return data(application);
});
