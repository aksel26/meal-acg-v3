import { requireCareersAdmin } from "@/lib/auth";
import { data, query, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { postingProcess } from "@/lib/validation/process";
import { json, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
const AFFECTED_APPLICATION_PAGE_SIZE = 1_000;

export const PUT = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const body = await json(request);
  const stages = postingProcess(body.stages);

  const { data: savedStages, error } = await createCareersServiceClient().rpc(
    "save_job_posting_process",
    {
      p_job_posting_id: uuid(id),
      p_stages: stages,
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  return data(savedStages);
});

export const GET = route(async (request: Request, context: Context) => {
  await requireCareersAdmin();
  const { id } = await context.params;
  const postingId = uuid(id);
  const search = query(request);
  const stageId = search.get("stageId");
  const statusId = search.get("statusId");
  const supabase = createCareersServiceClient();

  if (statusId) {
    const affectedApplicationIds = new Set<string>();
    const validatedStatusId = uuid(statusId, "상태 ID");
    const validatedStageId = stageId ? uuid(stageId, "단계 ID") : null;

    for (let from = 0; ; from += AFFECTED_APPLICATION_PAGE_SIZE) {
      let recordBuilder = supabase
        .from("application_stage_records")
        .select("application_id, application:applications!inner(id)")
        .eq("status_id", validatedStatusId)
        .eq("application.job_posting_id", postingId)
        .is("application.deleted_at", null)
        .in("application.status", ["active", "completed", "separated"])
        .order("application_id", { ascending: true })
        .range(from, from + AFFECTED_APPLICATION_PAGE_SIZE - 1);
      if (validatedStageId) {
        recordBuilder = recordBuilder.eq("stage_id", validatedStageId);
      }

      const { data: records, error } = await recordBuilder;
      throwIfError(error);
      for (const record of records ?? []) {
        affectedApplicationIds.add(record.application_id);
      }
      if ((records?.length ?? 0) < AFFECTED_APPLICATION_PAGE_SIZE) break;
    }

    return data({ affectedApplications: affectedApplicationIds.size });
  }

  let builder = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_posting_id", postingId)
    .is("deleted_at", null)
    .in("status", ["active", "completed", "separated"]);
  if (stageId)
    builder = builder.eq("current_stage_id", uuid(stageId, "단계 ID"));
  const { count, error } = await builder;
  throwIfError(error);
  return data({ affectedApplications: count ?? 0 });
});
