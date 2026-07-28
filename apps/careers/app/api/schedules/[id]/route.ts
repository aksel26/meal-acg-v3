import { requireCareersAdmin } from "@/lib/auth";
import { ApiError, data, route, throwIfError } from "@/lib/careers/http";
import { mapSchedule } from "@/lib/careers/mappers";
import { scheduleInput } from "@/lib/careers/schedules";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { json, uuid } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: schedule, error } = await createCareersServiceClient()
    .from("schedule_events")
    .update({ ...scheduleInput(await json(request)), updated_by: admin.id })
    .eq("id", uuid(id))
    .is("deleted_at", null)
    .select()
    .maybeSingle();
  throwIfError(error);
  if (!schedule) throw new ApiError("일정을 찾을 수 없습니다.", 404);
  return data(mapSchedule(schedule));
});

export const DELETE = route(async (_request: Request, context: Context) => {
  const admin = await requireCareersAdmin();
  const { id } = await context.params;
  const { data: schedule, error } = await createCareersServiceClient()
    .from("schedule_events")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: admin.id,
      updated_by: admin.id,
    })
    .eq("id", uuid(id))
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  throwIfError(error);
  if (!schedule) throw new ApiError("일정을 찾을 수 없습니다.", 404);
  return data({ ok: true });
});
