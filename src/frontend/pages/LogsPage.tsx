import { useEffect, useState } from "react";
import { ApiClient } from "../api";
import type { TaskLog } from "../../shared/types";
import { StatusBadge } from "../components/StatusBadge";
import { MethodBadge } from "../components/MethodBadge";

type LogsPageProps = {
  api: ApiClient;
  refreshKey: number;
};

export function LogsPage({ api, refreshKey }: LogsPageProps) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [task, setTask] = useState("");
  const [status, setStatus] = useState("");
  const [trigger, setTrigger] = useState("");
  const [method, setMethod] = useState("");
  const [selectedLog, setSelectedLog] = useState<TaskLog | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (task.trim()) params.set("task", task.trim());
      if (status) params.set("status", status);
      if (trigger) params.set("trigger", trigger);
      if (method) params.set("method", method);
      params.set("page", String(page));
      const result = await api.listLogs(params);
      setLogs(result.items);
      setHasNext(result.page.has_next);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey, task, status, trigger, method, page]);

  return (
    <div className="stack">
      <section className="toolbar">
        <div className="filters">
          <input placeholder="任务名称或 ID" value={task} onChange={(event) => setTask(event.target.value)} />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="error">error</option>
            <option value="timeout">timeout</option>
          </select>
          <select value={trigger} onChange={(event) => setTrigger(event.target.value)}>
            <option value="">全部触发方式</option>
            <option value="cron">cron</option>
            <option value="manual">manual</option>
            <option value="retry">retry</option>
          </select>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">全部方法</option>
            {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state">加载中</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">暂无日志</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Task</th>
                <th>Trigger</th>
                <th>Method</th>
                <th>Status</th>
                <th>HTTP</th>
                <th>Duration</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className="clickable-row">
                  <td>{new Date(log.started_at).toLocaleString()}</td>
                  <td>
                    <div className="task-cell">
                      <span>{log.task_name ?? `Task ${log.task_id}`}</span>
                      <small>#{log.task_id}</small>
                    </div>
                  </td>
                  <td>{log.trigger_type}</td>
                  <td><MethodBadge method={log.request_method} /></td>
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

      <div className="pagination">
        <button className="button secondary" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
          上一页
        </button>
        <span>第 {page} 页</span>
        <button className="button secondary" type="button" onClick={() => setPage((value) => value + 1)} disabled={!hasNext}>
          下一页
        </button>
      </div>

      {selectedLog && (
        <section className="panel subpanel">
          <div className="toolbar-actions">
            <h3>日志详情</h3>
            <button className="button secondary" type="button" onClick={() => setSelectedLog(null)}>
              关闭
            </button>
          </div>
          <dl className="detail-list">
            <div><dt>Task</dt><dd>{selectedLog.task_name ?? selectedLog.task_id}</dd></div>
            <div><dt>Trigger</dt><dd>{selectedLog.trigger_type}</dd></div>
            <div><dt>Method</dt><dd><MethodBadge method={selectedLog.request_method} /></dd></div>
            <div><dt>Status</dt><dd><StatusBadge status={selectedLog.status} /></dd></div>
            <div><dt>HTTP</dt><dd>{selectedLog.http_status ?? "-"}</dd></div>
            <div><dt>Duration</dt><dd>{selectedLog.duration_ms ? `${selectedLog.duration_ms} ms` : "-"}</dd></div>
          </dl>
          <pre className="code-block">{JSON.stringify({
            request_headers: selectedLog.request_headers,
            request_body_preview: selectedLog.request_body_preview,
            response_headers: selectedLog.response_headers,
            response_body_preview: selectedLog.response_body_preview,
            error_message: selectedLog.error_message
          }, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
