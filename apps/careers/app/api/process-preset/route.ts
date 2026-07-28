import { requireCareersAdmin } from "@/lib/auth";
import { data, route, throwIfError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";
import { json } from "@/lib/validation";
import { postingProcess } from "@/lib/validation/process";

export const GET = route(async () => {
  await requireCareersAdmin();
  const { data: preset, error } = await createCareersServiceClient()
    .from("process_presets")
    .select("stages")
    .eq("singleton", true)
    .single();
  throwIfError(error);
  return data({ stages: normalizePresetStages(preset?.stages) });
});

export const PUT = route(async (request: Request) => {
  const admin = await requireCareersAdmin();
  const stages = postingProcess((await json(request)).stages);
  const { data: saved, error } = await createCareersServiceClient().rpc(
    "save_process_preset",
    {
      p_stages: stages,
      p_actor_admin_id: admin.id,
    },
  );
  throwIfError(error);
  return data({ stages: normalizePresetStages(saved) });
});

function normalizePresetStages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((stageValue, stageIndex) => {
    const stage =
      stageValue && typeof stageValue === "object" && !Array.isArray(stageValue)
        ? (stageValue as Record<string, unknown>)
        : {};
    const statuses = Array.isArray(stage.statuses) ? stage.statuses : [];
    return {
      id: typeof stage.id === "string" ? stage.id : crypto.randomUUID(),
      name: typeof stage.name === "string" ? stage.name : "",
      displayOrder: stageIndex,
      showOnCalendar: stage.showOnCalendar === true,
      isActive: true,
      autoSend: stage.autoSend ?? {
        enabled: false,
        channels: ["email", "sms"],
        title: "{{전형단계명}} 안내",
        body: "",
      },
      statuses: statuses.map((statusValue, statusIndex) => {
        const status =
          statusValue &&
          typeof statusValue === "object" &&
          !Array.isArray(statusValue)
            ? (statusValue as Record<string, unknown>)
            : {};
        return {
          id: typeof status.id === "string" ? status.id : crypto.randomUUID(),
          name: typeof status.name === "string" ? status.name : "",
          color: typeof status.color === "string" ? status.color : "gray",
          isDefault: statusIndex === 0,
          isCompletion: statusIndex === statuses.length - 1,
          hasDateInput: status.hasDateInput !== false,
          isActive: true,
          displayOrder: statusIndex,
        };
      }),
    };
  });
}
