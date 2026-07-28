import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { json, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const body = await json(request);
  const { data: separation, error } = await createCareersServiceClient().rpc(
    "update_application_separation_reason",
    {
      p_application_id: uuid(id),
      p_reason: text(body.reason, "별도 관리 사유", {
        required: true,
        max: 5_000,
      }),
      p_actor_id: admin.id,
    },
  );
  throwIfError(error);
  return data(separation);
});
