import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/projects";
import { listRequestsForUser } from "@/lib/requests";
import { createWorkClient } from "@/lib/supabase/client-work";

export async function GET() {
  try {
    const user = await requireAuth();
    const [requests, projects] = await Promise.all([
      listRequestsForUser(user, "queue"),
      listProjectsForUser(user),
    ]);

    const now = new Date();
    const today = toDateKey(now);
    const soon = toDateKey(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
    );
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = String(now.getFullYear());

    const activeAssigned = requests.filter(
      (r) => r.status !== "완료" && r.status !== "거절",
    );
    const completed = requests.filter((r) => r.status === "완료");
    const urgentCount = activeAssigned.filter(
      (r) => r.due_date && r.due_date >= today && r.due_date <= soon,
    ).length;

    const contacts = await getContactStats(yearKey);

    return NextResponse.json({
      activeProjects: projects.filter((p) => p.status !== "완료").length,
      urgentProjects: projects.filter(
        (p) =>
          p.status !== "완료" &&
          p.due_date &&
          p.due_date >= today &&
          p.due_date <= soon,
      ).length,
      completedThisMonth: completed.filter((r) =>
        (r.completed_at ?? "").startsWith(monthKey),
      ).length,
      completedThisYear: completed.filter((r) =>
        (r.completed_at ?? "").startsWith(yearKey),
      ).length,
      openAssigned: activeAssigned.length,
      urgentCount,
      topRequester: contacts.topRequester,
      topTeam: contacts.topTeam,
      topCustomer: contacts.topCustomer,
    });
  } catch (error) {
    console.error("GET /api/project-stats error:", error);
    return NextResponse.json(
      { error: "프로젝트 통계를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function getContactStats(yearKey: string) {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("requests")
    .select("requester_name, team_name, team_names, customer_names, created_at")
    .gte("created_at", `${yearKey}-01-01T00:00:00.000Z`);

  if (error) throw error;

  type Row = {
    requester_name: string | null;
    team_name: string | null;
    team_names: string[] | null;
    customer_names: string[] | null;
  };
  const rows = (data ?? []) as Row[];

  return {
    topRequester: topByName(rows.map((row) => row.requester_name)),
    topTeam: topByName(
      rows.flatMap((row) => {
        if (Array.isArray(row.team_names) && row.team_names.length > 0) {
          return row.team_names;
        }
        return row.team_name ? [row.team_name] : [];
      }),
    ),
    topCustomer: topByName(
      rows.flatMap((row) =>
        Array.isArray(row.customer_names) ? row.customer_names : [],
      ),
    ),
  };
}

function topByName(names: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}
