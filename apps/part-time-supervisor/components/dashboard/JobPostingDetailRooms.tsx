import type { DashboardWorker } from "@/hooks/use-dashboard";
import { ROOMS, getRoomById } from "@/lib/room-constants";

type Props = {
  workers: DashboardWorker[];
};

type RoomGroup = {
  roomId: string;
  roomName: string;
  entries: Array<{
    workerName: string;
    startTime: string;
    endTime: string;
  }>;
};

export function JobPostingDetailRooms({ workers }: Props) {
  const roomMap = new Map<string, RoomGroup>();

  for (const worker of workers) {
    if (!worker.roomSlots || worker.roomSlots.length === 0) continue;
    for (const slot of worker.roomSlots) {
      if (!roomMap.has(slot.room)) {
        const room = getRoomById(slot.room);
        roomMap.set(slot.room, {
          roomId: slot.room,
          roomName: room?.name ?? slot.room,
          entries: [],
        });
      }
      roomMap.get(slot.room)!.entries.push({
        workerName: worker.name ?? "",
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
    }
  }

  const orderedRooms = ROOMS
    .map((r) => roomMap.get(r.id))
    .filter((g): g is RoomGroup => g !== undefined);

  const unassigned = workers.filter(
    (w) => !w.roomSlots || w.roomSlots.length === 0
  );

  return (
    <div className="space-y-3">
      {orderedRooms.length === 0 && unassigned.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          회의실 배정 데이터가 없습니다.
        </p>
      )}

      {orderedRooms.map((group) => (
        <div
          key={group.roomId}
          className="rounded-lg border bg-muted/30 px-4 py-3"
        >
          <h5 className="mb-2 text-sm font-semibold">{group.roomName}</h5>
          <div className="space-y-1">
            {group.entries
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{entry.workerName}</span>
                  <span className="text-muted-foreground">
                    {entry.startTime}–{entry.endTime}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="rounded-lg border bg-muted/10 px-4 py-3">
          <h5 className="mb-1.5 text-sm font-semibold text-muted-foreground">
            미배정 ({unassigned.length}명)
          </h5>
          <p className="text-sm text-muted-foreground">
            {unassigned.map((w) => w.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
