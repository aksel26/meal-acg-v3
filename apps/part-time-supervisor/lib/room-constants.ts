export const ROOMS = [
  { id: "C1", name: "C1", capacity: 30 },
  { id: "C2", name: "C2", capacity: 25 },
  { id: "R", name: "R", capacity: 20 },
  { id: "G", name: "G", capacity: 15 },
  { id: "406-1", name: "406-1", capacity: 20 },
  { id: "406-2", name: "406-2", capacity: 20 },
  { id: "16F", name: "16층", capacity: 40 },
] as const;

export type RoomId = (typeof ROOMS)[number]["id"];

export type RoomSlot = {
  date: string;
  start_time: string;
  end_time: string;
  room: RoomId;
};

export function getRoomById(id: string) {
  return ROOMS.find((r) => r.id === id);
}

export function getRoomCapacity(roomId: string): number {
  return getRoomById(roomId)?.capacity ?? 0;
}
