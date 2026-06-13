import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { TaskStatus } from "../../shared/types";
import { useTranslation } from "../i18n";

const labelKeys: Record<TaskStatus, string> = {
  success: "status.success",
  failed: "status.failed",
  error: "status.error",
  timeout: "status.timeout",
  queued: "status.queued",
  never_run: "status.neverRun"
};

export function StatusBadge({ status }: { status: TaskStatus | null }) {
  const value = status ?? "never_run";
  const { t } = useTranslation();
  const Icon = value === "success" ? CheckCircle2 : value === "queued" || value === "never_run" ? Clock3 : XCircle;
  return <span className={`status-badge status-${value}`}><Icon size={14} />{t(labelKeys[value])}</span>;
}
