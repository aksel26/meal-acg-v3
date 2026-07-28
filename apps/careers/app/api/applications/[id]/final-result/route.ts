import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { FINAL_RESULTS } from "@/lib/types";
import { json, oneOf, text, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const body = await json(request);
  const { data: result, error } = await createCareersServiceClient().rpc(
    "set_application_final_result",
    {
      p_application_id: uuid(id),
      p_result: oneOf(body.result, FINAL_RESULTS, "최종 결과"),
      p_actor_id: admin.id,
      p_note: text(body.reason ?? body.note, "결과 메모", { max: 5_000 }),
    },
  );
  throwIfError(error);
  return data(result);
});
