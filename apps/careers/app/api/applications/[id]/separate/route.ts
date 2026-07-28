import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { json, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const body = await json(request);
  const { data: separation, error } = await createCareersServiceClient().rpc(
    "separate_application",
    {
      p_application_id: uuid(id),
      p_actor_id: admin.id,
      p_reason: text(body.reason, "별도 관리 사유", {
        required: true,
        max: 2_000,
      }),
    },
  );
  throwIfError(error);
  return data(separation);
});
