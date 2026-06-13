import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  FileText,
  ListChecks,
  PauseCircle,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiClient, ApiError } from "../api";
import type { TaskDetail, TaskSummary } from "../../shared/types";
import { useTranslation } from "../i18n";
import { MethodBadge } from "../components/MethodBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TaskDrawer } from "../components/TaskDrawer";

type TasksPageProps = {
  api: ApiClient;
  refreshKey: number;
  onOpenTaskDetail: (id: number) => void;
};

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone?: "green" | "orange" | "red";
};

function Sparkline({ tone = "green" }: { tone?: "green" | "orange" | "red" }) {
  return (
    <svg className={`sparkline sparkline-${tone}`} viewBox="0 0 92 32" aria-hidden="true">
      <polyline points="2,25 10,21 17,22 25,14 33,17 42,7 50,20 59,24 68,15 76,5 84,18 90,17" />
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone = "green" }: MetricCardProps) {
  return (
    <article className="metric-card">
      <span className={`metric-icon metric-icon-${tone}`}>
        <Icon size={24} />
      </span>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
      <Sparkline tone={tone} />
    </article>
  );
}

export function TasksPage({ api, refreshKey, onOpenTaskDetail }: TasksPageProps) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [enabled, setEnabled] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<TaskDetail | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TaskSummary | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasActiveFilters = Boolean(search.trim() || status || method || enabled);
  const { t } = useTranslation();

  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("search", search.trim());
    if (status) next.set("status", status);
    if (method) next.set("method", method);
    if (enabled) next.set("enabled", enabled === "true" ? "true" : "false");
    return next;
  }, [enabled, method, search, status]);

  async function load() {
    setLoading(true);
    try {
      const result = await api.listTasks(params);
      setTasks(result.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey, params]);

  async function openNewTask() {
    setEditingTaskId(null);
    setDrawerTask(null);
    setDrawerOpen(true);
  }

  async function openEdit(taskId: number) {
    setDrawerTask(await api.getTask(taskId));
    setEditingTaskId(taskId);
    setDrawerOpen(true);
  }

  async function submitTask(input: Parameters<typeof api.createTask>[0]) {
    try {
      if (editingTaskId) {
        await api.updateTask(editingTaskId, input);
      } else {
        await api.createTask(input);
      }
      setDrawerOpen(false);
      setDrawerTask(null);
      setEditingTaskId(null);
      await load();
      return null;
    } catch (error) {
      const apiError = error as ApiError;
      return apiError.fieldErrors ?? { form: apiError.message };
    }
  }

  async function toggleEnabled(task: TaskSummary) {
    setBusyTaskId(task.id);
    try {
      await api.setTaskEnabled(task.id, !task.enabled);
      await load();
    } finally {
      setBusyTaskId(null);
    }
  }

  async function runTask(task: TaskSummary) {
    setBusyTaskId(task.id);
    try {
      await api.runTask(task.id);
      setMessage(t("tasks.run.queued"));
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(task: TaskSummary) {
    setBusyTaskId(task.id);
    try {
      await api.deleteTask(task.id);
      setConfirmDelete(null);
      await load();
    } finally {
      setBusyTaskId(null);
    }
  }

  const metrics = useMemo(() => {
    const failedStatuses = new Set(["failed", "error", "timeout"]);
    return {
      total: tasks.length,
      enabled: tasks.filter((task) => task.enabled).length,
      paused: tasks.filter((task) => !task.enabled).length,
      needsAttention: tasks.filter((task) => task.last_status && failedStatuses.has(task.last_status)).length
    };
  }, [tasks]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setMethod("");
    setEnabled("");
  }

  return (
    <div className="stack">
      <section className="task-overview" aria-label={t("tasks.metrics.aria")}>
        <MetricCard icon={ClipboardList} label={t("tasks.metric.total")} value={metrics.total} hint={hasActiveFilters ? t("tasks.metric.totalHintFiltered") : t("tasks.metric.totalHintAll")} />
        <MetricCard icon={PlayCircle} label={t("tasks.metric.running")} value={metrics.enabled} hint={t("tasks.metric.runningHint")} />
        <MetricCard icon={PauseCircle} label={t("tasks.metric.disabled")} value={metrics.paused} hint={t("tasks.metric.disabledHint")} tone="orange" />
        <MetricCard icon={AlertCircle} label={t("tasks.metric.needsAttention")} value={metrics.needsAttention} hint={t("tasks.metric.needsAttentionHint")} tone="red" />
      </section>

      <section className="panel list-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon"><ListChecks size={22} /></span>
            <div>
              <h2>{t("tasks.panel.title")}</h2>
              <p>{t("tasks.panel.description")}</p>
            </div>
          </div>
          <div className="toolbar-actions">
            {message && <span className="inline-message">{message}</span>}
            <button className="button primary" type="button" onClick={openNewTask}>
              <Plus size={17} />
              {t("tasks.create")}
            </button>
            <button className="button secondary" type="button" onClick={load}>
              <RefreshCcw size={16} />
              {t("tasks.refresh")}
            </button>
          </div>
        </div>

        <div className="filters task-filters" aria-label={t("tasks.filter.aria")}>
          <label className="search-field">
            <Search size={18} />
            <input aria-label={t("tasks.search.placeholder")} placeholder={t("tasks.search.placeholder")} value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <select aria-label={t("tasks.filter.allStatus")} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t("tasks.filter.allStatus")}</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="error">error</option>
            <option value="timeout">timeout</option>
          </select>
          <select aria-label={t("tasks.filter.allMethods")} value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">{t("tasks.filter.allMethods")}</option>
            {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select aria-label={t("tasks.filter.allEnabled")} value={enabled} onChange={(event) => setEnabled(event.target.value)}>
            <option value="">{t("tasks.filter.allEnabled")}</option>
            <option value="true">{t("tasks.filter.enabled")}</option>
            <option value="false">{t("tasks.filter.disabled")}</option>
          </select>
          <button className="button secondary filter-reset" type="button" onClick={resetFilters} disabled={!hasActiveFilters}>
            <RefreshCcw size={16} />
            {t("tasks.filter.reset")}
          </button>
        </div>

        <div className="table-panel">
          {loading ? (
            <div className="empty-state">{t("tasks.loading")}</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-copy">
                <span className="empty-kicker">{t("tasks.empty.kicker")}</span>
                <p>{hasActiveFilters ? t("tasks.empty.titleFiltered") : t("tasks.empty.title")}</p>
                <small>{hasActiveFilters ? t("tasks.empty.descFiltered") : t("tasks.empty.desc")}</small>
              </div>
              <div className="toolbar-actions">
                {hasActiveFilters && (
                  <button className="button secondary" type="button" onClick={resetFilters}>
                    {t("tasks.empty.clearFilters")}
                  </button>
                )}
                <button className="button primary" type="button" onClick={openNewTask}>
                  {t("tasks.empty.create")}
                </button>
              </div>
            </div>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th>{t("tasks.table.status")}</th>
                  <th>{t("tasks.table.name")}</th>
                  <th>{t("tasks.table.request")}</th>
                  <th>{t("tasks.table.interval")}</th>
                  <th>{t("tasks.table.scheduleStatus")}</th>
                  <th>{t("tasks.table.lastStatus")}</th>
                  <th>{t("tasks.table.httpStatus")}</th>
                  <th>{t("tasks.table.lastRunTime")}</th>
                  <th>{t("tasks.table.nextRun")}</th>
                  <th>{t("tasks.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <label className="switch-inline">
                        <input type="checkbox" checked={task.enabled} onChange={() => void toggleEnabled(task)} />
                        <span />
                      </label>
                    </td>
                    <td>
                      <button className="link-button task-name-link" type="button" onClick={() => onOpenTaskDetail(task.id)}>
                        {task.name}
                      </button>
                      <small className="muted">#{task.id}</small>
                    </td>
                    <td>
                      <div className="request-cell">
                        <MethodBadge method={task.method} />
                        <span className="truncate">{task.url}</span>
                      </div>
                    </td>
                    <td>{task.interval_minutes}min</td>
                    <td>{task.enabled ? t("tasks.schedule.auto") : t("tasks.schedule.paused")}</td>
                    <td>
                      <StatusBadge status={task.last_status} />
                    </td>
                    <td className={task.last_http_status ? (task.last_http_status < 400 ? "http-success" : "http-error") : ""}>{task.last_http_status ? `HTTP ${task.last_http_status}` : "-"}</td>
                    <td>{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : t("tasks.lastRun.never")}</td>
                    <td>{task.next_run_at ? new Date(task.next_run_at).toLocaleString() : "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" type="button" title={t("tasks.action.view")} aria-label={t("tasks.action.viewAria")} onClick={() => onOpenTaskDetail(task.id)}>
                          <FileText size={16} />
                        </button>
                        <button className="icon-button" type="button" title={t("tasks.action.edit")} aria-label={t("tasks.action.editAria")} onClick={() => void openEdit(task.id)}>
                          <Pencil size={16} />
                        </button>
                        <button className="icon-button success-action" type="button" title={t("tasks.action.run")} aria-label={t("tasks.action.runAria")} onClick={() => void runTask(task)} disabled={busyTaskId === task.id}>
                          <Play size={16} />
                        </button>
                        <button className="icon-button danger-action" type="button" title={t("tasks.action.delete")} aria-label={t("tasks.action.deleteAria")} onClick={() => setConfirmDelete(task)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel-footer">
          <div className="pager-mini">
            <button type="button" disabled aria-label={t("tasks.pagination.prev")}>‹</button>
            <span>1</span>
            <button type="button" disabled aria-label={t("tasks.pagination.next")}>›</button>
          </div>
          <span>{t("tasks.pagination.total", { count: tasks.length })}</span>
        </div>
      </section>

      {drawerOpen && (
        <TaskDrawer
          task={editingTaskId ? drawerTask : null}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerTask(null);
            setEditingTaskId(null);
          }}
          onSubmit={submitTask}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t("tasks.delete.title")}
          body={t("tasks.delete.confirm", { name: confirmDelete.name })}
          confirmLabel={t("tasks.delete.button")}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void deleteTask(confirmDelete)}
          busy={busyTaskId === confirmDelete.id}
        />
      )}
    </div>
  );
}
