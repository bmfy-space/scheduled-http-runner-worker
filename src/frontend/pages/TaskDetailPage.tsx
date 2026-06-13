import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Clipboard, Clock3, Pencil, Play, RefreshCcw, Trash2 } from "lucide-react";
import { ApiClient, ApiError } from "../api";
import type { TaskDetail, TaskInput, TaskLog } from "../../shared/types";
import { useTranslation } from "../i18n";
import { MethodBadge } from "../components/MethodBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TaskDrawer } from "../components/TaskDrawer";

type TaskDetailPageProps = {
  api: ApiClient;
  taskId: number;
  refreshKey: number;
  onBack: () => void;
  onRefresh: () => void;
};

function countdown(nextRunAt: string | null) {
  if (!nextRunAt) return "00:00:00";
  const diff = Math.max(0, new Date(nextRunAt).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function StatusLine() {
  return (
    <svg className="detail-sparkline" viewBox="0 0 180 48" aria-hidden="true">
      <polyline points="4,36 24,29 44,24 64,26 84,22 104,14 124,18 144,25 164,11 176,7" />
      <g>
        {[4, 24, 44, 64, 84, 104, 124, 144, 164, 176].map((x, index) => (
          <circle key={x} cx={x} cy={[36, 29, 24, 26, 22, 14, 18, 25, 11, 7][index]} r="2.5" />
        ))}
      </g>
    </svg>
  );
}

export function TaskDetailPage({ api, taskId, refreshKey, onBack, onRefresh }: TaskDetailPageProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  async function load() {
    setLoading(true);
    try {
      const [taskResult, logResult] = await Promise.all([api.getTask(taskId), api.listTaskLogs(taskId)]);
      setTask(taskResult);
      setLogs(logResult.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [taskId, refreshKey]);

  const requestConfig = useMemo(() => task ? JSON.stringify({ headers: task.headers, body_type: task.body_type, body: task.body }, null, 2) : "", [task]);

  async function submitTask(input: TaskInput) {
    try {
      await api.updateTask(taskId, input);
      setDrawerOpen(false);
      await load();
      return null;
    } catch (error) {
      const apiError = error as ApiError;
      return apiError.fieldErrors ?? { form: apiError.message };
    }
  }

  async function toggle() {
    if (!task) return;
    setBusy(true);
    try {
      await api.setTaskEnabled(task.id, !task.enabled);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    try {
      await api.runTask(taskId);
      setMessage(t("detail.run.queued"));
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteTask(taskId);
      setConfirmDelete(false);
      onBack();
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !task) {
    return <div className="empty-state">{t("detail.loading")}</div>;
  }

  return (
    <div className="stack">
      <section className="toolbar detail-actions-bar">
        <div className="toolbar-actions">
          <button className="button secondary" type="button" onClick={onBack}>
            <ArrowLeft size={16} />
            {t("detail.back")}
          </button>
          <button className="button secondary" type="button" onClick={load}>
            <RefreshCcw size={16} />
            {t("detail.refresh")}
          </button>
          {message && <span className="inline-message">{message}</span>}
        </div>
        <div className="toolbar-actions">
          <button className="button secondary" type="button" onClick={() => setDrawerOpen(true)}>
            <Pencil size={16} />
            {t("detail.edit")}
          </button>
          <button className="button secondary" type="button" onClick={() => void toggle()} disabled={busy}>
            <Play size={16} />
            {task.enabled ? t("detail.disable") : t("detail.enable")}
          </button>
          <button className="button primary" type="button" onClick={() => void run()} disabled={busy}>
            <Play size={16} />
            {t("detail.run")}
          </button>
          <button className="button danger" type="button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            {t("detail.delete")}
          </button>
        </div>
      </section>

      <section className="panel detail-hero">
        <div className="detail-identity">
          <h2>{task.name}</h2>
          <p>{task.notes ?? task.name} <span>·</span> #{task.id}</p>
          <div className="detail-meta">
            <StatusBadge status={task.last_status} />
            <MethodBadge method={task.method} />
            <span className="soft-pill">{task.enabled ? t("detail.status.enabled") : t("detail.status.disabled")}</span>
          </div>
          <div className="detail-kind">
            <CalendarClock size={17} />
            {t("detail.kind")}
          </div>
        </div>
        <dl className="detail-list hero-list">
          <div><dt>{t("detail.label.url")}</dt><dd>{task.url}</dd></div>
          <div><dt>{t("detail.label.interval")}</dt><dd>{task.interval_minutes} min</dd></div>
          <div><dt>{t("detail.label.timeout")}</dt><dd>{task.timeout_ms} ms</dd></div>
          <div><dt>{t("detail.label.nextRun")}</dt><dd>{task.next_run_at ? new Date(task.next_run_at).toLocaleString() : "-"}</dd></div>
          <div><dt>{t("detail.label.lastRun")}</dt><dd>{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : "-"}</dd></div>
        </dl>
      </section>

      <section className="detail-main-grid">
        <div className="panel subpanel request-config-panel">
          <h3>{t("detail.section.requestConfig")}</h3>
          <div className="config-tabs">
            <span>{t("detail.tab.method")}<strong>{task.method}</strong></span>
            <span>{t("detail.tab.bodyType")}<strong>{task.body_type}</strong></span>
            <button className="icon-button flat" type="button" title={t("detail.action.copyConfig")} aria-label={t("detail.action.copyConfig")} onClick={() => void navigator.clipboard?.writeText(requestConfig)}>
              <Clipboard size={17} />
            </button>
          </div>
          <pre className="code-block">{requestConfig}</pre>
        </div>

        <aside className="detail-side-stack">
          <section className="panel subpanel runtime-panel">
            <h3>{t("detail.section.runtime")}</h3>
            <dl className="detail-list compact-list">
              <div><dt>{t("detail.label.status")}</dt><dd><StatusBadge status={task.last_status} /></dd></div>
              <div><dt>{t("detail.label.trigger")}</dt><dd>cron</dd></div>
              <div><dt>{t("detail.label.intervalTime")}</dt><dd>{task.interval_minutes} min</dd></div>
              <div><dt>{t("detail.label.timeoutTime")}</dt><dd>{task.timeout_ms} ms</dd></div>
              <div><dt>{t("detail.label.successRate")}</dt><dd>{logs.length ? `${Math.round((logs.filter((log) => log.status === "success").length / logs.length) * 100)}%` : "-"}</dd></div>
              <div><dt>{t("detail.label.lastHttpCode")}</dt><dd>{task.last_http_status ?? "-"}</dd></div>
            </dl>
            <StatusLine />
          </section>

          <section className="panel next-run-card">
            <div>
              <h3>{t("detail.section.nextRun")}</h3>
              <p><Clock3 size={17} /> {task.next_run_at ? new Date(task.next_run_at).toLocaleString() : "-"}</p>
            </div>
            <strong>{countdown(task.next_run_at)}</strong>
            <span>{t("detail.countdown.suffix")}</span>
          </section>
        </aside>
      </section>

      <section className="panel subpanel">
        <h3>{t("detail.section.recentLogs")}</h3>
        {logs.length === 0 ? <div className="empty-state compact">{t("detail.logs.empty")}</div> : (
          <table>
            <thead>
              <tr>
                <th>{t("detail.logs.time")}</th>
                <th>{t("detail.logs.trigger")}</th>
                <th>{t("detail.logs.status")}</th>
                <th>{t("detail.logs.http")}</th>
                <th>{t("detail.logs.duration")}</th>
                <th>{t("detail.logs.error")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.started_at).toLocaleString()}</td>
                  <td>{log.trigger_type}</td>
                  <td><StatusBadge status={log.status} /></td>
                  <td>{log.http_status ?? "-"}</td>
                  <td>{log.duration_ms ? `${log.duration_ms} ms` : "-"}</td>
                  <td className="truncate">{log.error_message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {drawerOpen && (
        <TaskDrawer task={task} onClose={() => setDrawerOpen(false)} onSubmit={submitTask} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("detail.delete.title")}
          body={t("detail.delete.confirm", { name: task.name })}
          confirmLabel={t("detail.delete.button")}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
          busy={busy}
        />
      )}
    </div>
  );
}
