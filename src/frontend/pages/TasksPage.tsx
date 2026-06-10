import { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Plus, Play, RefreshCcw, Trash2 } from "lucide-react";
import { ApiClient, ApiError } from "../api";
import type { TaskDetail, TaskSummary } from "../../shared/types";
import { MethodBadge } from "../components/MethodBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TaskDrawer } from "../components/TaskDrawer";

type TasksPageProps = {
  api: ApiClient;
  refreshKey: number;
  onOpenTaskDetail: (id: number) => void;
};

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
        setMessage("任务已保存");
      } else {
        await api.createTask(input);
        setMessage("任务已创建");
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
      setMessage("已加入执行队列");
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

  return (
    <div className="stack">
      <section className="toolbar">
        <div className="toolbar-actions">
          <button className="button primary" type="button" onClick={openNewTask}>
            <Plus size={16} />
            新建任务
          </button>
          <button className="button secondary" type="button" onClick={load}>
            <RefreshCcw size={16} />
            刷新
          </button>
          {message && <span className="inline-message">{message}</span>}
        </div>
        <div className="filters">
          <input placeholder="搜索名称或 URL" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="error">error</option>
            <option value="timeout">timeout</option>
          </select>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">全部方法</option>
            {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={enabled} onChange={(event) => setEnabled(event.target.value)}>
            <option value="">全部启用状态</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </div>
      </section>

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state">加载中</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>暂无任务</p>
            <button className="button primary" type="button" onClick={openNewTask}>
              新建任务
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Enabled</th>
                <th>ID</th>
                <th>Name</th>
                <th>Method</th>
                <th>URL</th>
                <th>Interval</th>
                <th>Last Status</th>
                <th>Last HTTP</th>
                <th>Last Run</th>
                <th>Next Run</th>
                <th>Actions</th>
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
                  <td>{task.id}</td>
                  <td>
                    <button className="link-button" type="button" onClick={() => onOpenTaskDetail(task.id)}>
                      {task.name}
                    </button>
                  </td>
                  <td><MethodBadge method={task.method} /></td>
                  <td className="truncate">{task.url}</td>
                  <td>{task.interval_minutes} min</td>
                  <td><StatusBadge status={task.last_status} /></td>
                  <td>{task.last_http_status ?? "-"}</td>
                  <td>{task.last_run_at ? new Date(task.last_run_at).toLocaleString() : "-"}</td>
                  <td>{task.next_run_at ? new Date(task.next_run_at).toLocaleString() : "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" type="button" title="查看" onClick={() => onOpenTaskDetail(task.id)}>
                        <FileText size={16} />
                      </button>
                      <button className="icon-button" type="button" title="编辑" onClick={() => void openEdit(task.id)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button" type="button" title="运行" onClick={() => void runTask(task)} disabled={busyTaskId === task.id}>
                        <Play size={16} />
                      </button>
                      <button className="icon-button" type="button" title="删除" onClick={() => setConfirmDelete(task)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          title="删除任务"
          body={`确认删除「${confirmDelete.name}」吗？该操作会保留日志。`}
          confirmLabel="删除"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void deleteTask(confirmDelete)}
          busy={busyTaskId === confirmDelete.id}
        />
      )}
    </div>
  );
}
