import { useEffect, useState } from "react";
import { Pencil, Play, RefreshCcw, Trash2 } from "lucide-react";
import { ApiClient, ApiError } from "../api";
import type { TaskDetail, TaskInput, TaskLog } from "../../shared/types";
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

export function TaskDetailPage({ api, taskId, refreshKey, onBack, onRefresh }: TaskDetailPageProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("已加入执行队列");
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
    return <div className="empty-state">加载中</div>;
  }

  return (
    <div className="stack">
      <section className="toolbar">
        <div className="toolbar-actions">
          <button className="button secondary" type="button" onClick={onBack}>
            返回
          </button>
          <button className="button secondary" type="button" onClick={load}>
            <RefreshCcw size={16} />
            刷新
          </button>
          {message && <span className="inline-message">{message}</span>}
        </div>
        <div className="toolbar-actions">
          <button className="button secondary" type="button" onClick={() => setDrawerOpen(true)}>
            <Pencil size={16} />
            编辑
          </button>
          <button className="button secondary" type="button" onClick={() => void toggle()} disabled={busy}>
            {task.enabled ? "停用" : "启用"}
          </button>
          <button className="button primary" type="button" onClick={() => void run()} disabled={busy}>
            <Play size={16} />
            立即执行
          </button>
          <button className="button danger" type="button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </section>

      <section className="panel detail-grid">
        <div>
          <h2>{task.name}</h2>
          <p className="muted">{task.notes ?? "无备注"}</p>
          <div className="detail-meta">
            <StatusBadge status={task.last_status} />
            <MethodBadge method={task.method} />
            <span>{task.enabled ? "启用" : "停用"}</span>
          </div>
        </div>
        <dl className="detail-list">
          <div><dt>URL</dt><dd>{task.url}</dd></div>
          <div><dt>Interval</dt><dd>{task.interval_minutes} min</dd></div>
          <div><dt>Timeout</dt><dd>{task.timeout_ms} ms</dd></div>
          <div><dt>Next Run</dt><dd>{task.next_run_at ? new Date(task.next_run_at).toLocaleString() : "-"}</dd></div>
          <div><dt>Last Run</dt><dd>{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : "-"}</dd></div>
        </dl>
      </section>

      <section className="panel subpanel">
        <h3>请求配置</h3>
        <pre className="code-block">{JSON.stringify({ headers: task.headers, body_type: task.body_type, body: task.body }, null, 2)}</pre>
      </section>

      <section className="panel subpanel">
        <h3>最近日志</h3>
        {logs.length === 0 ? <div className="empty-state compact">暂无日志</div> : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>HTTP</th>
                <th>Duration</th>
                <th>Error</th>
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
          title="删除任务"
          body={`确认删除「${task.name}」吗？`}
          confirmLabel="删除"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void remove()}
          busy={busy}
        />
      )}
    </div>
  );
}
