import type { TaskStatus } from "../../shared/types";

const labels: Record<TaskStatus, string> = {
  success: "success",
  failed: "failed",
  error: "error",
  timeout: "timeout",
  queued: "queued",
  never_run: "never run"
};

export function StatusBadge({ status }: { status: TaskStatus | null }) {
  const value = status ?? "never_run";
  return <span className={`status-badge status-${value}`}>{labels[value]}</span>;
}
