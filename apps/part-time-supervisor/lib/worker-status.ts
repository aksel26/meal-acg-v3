type WorkerStatus = "registered" | "contracted" | "working" | "completed";

export async function syncWorkerStatus(
  supabase: { from: (table: string) => any },
  workerId: string
) {
  const { data: assignments, error: assignError } = await supabase
    .from("assignments")
    .select("status, attendance_status")
    .eq("worker_id", workerId);

  if (assignError) {
    console.error("syncWorkerStatus: failed to fetch assignments", assignError);
    return;
  }

  let newStatus: WorkerStatus;

  if (!assignments || assignments.length === 0) {
    newStatus = "registered";
  } else if (
    assignments.every(
      (a: { status: string }) => a.status === "completed" || a.status === "cancelled"
    )
  ) {
    newStatus = "completed";
  } else if (
    assignments.some(
      (a: { attendance_status: string }) =>
        a.attendance_status === "checked_in" ||
        a.attendance_status === "confirmed"
    )
  ) {
    newStatus = "working";
  } else {
    newStatus = "contracted";
  }

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("status")
    .eq("id", workerId)
    .single();

  if (workerError) {
    console.error("syncWorkerStatus: failed to fetch worker", workerError);
    return;
  }

  if (worker.status !== newStatus) {
    const { error: updateError } = await supabase
      .from("workers")
      .update({ status: newStatus })
      .eq("id", workerId);

    if (updateError) {
      console.error("syncWorkerStatus: failed to update worker", updateError);
    }
  }
}
