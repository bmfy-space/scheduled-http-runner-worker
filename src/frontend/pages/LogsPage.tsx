import { useEffect, useMemo, useState } from "react";
import { Calendar, Copy, Download, Eye, RefreshCcw, RotateCcw, Search, X } from "lucide-react";
import { ApiClient } from "../api";
import type { TaskLog } from "../../shared/types";
import { useTranslation } from "../i18n";
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
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const { t } = useTranslation();

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
      setSelectedLog((current) => {
        if (current && result.items.some((item) => item.id === current.id)) return current;
        return null;
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [refreshKey, task, status, trigger, method, page]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const stats = useMemo(() => {
    const successCount = logs.filter((log) => log.status === "success").length;
    const durations = logs.map((log) => log.duration_ms).filter((duration): duration is number => duration !== null);
    const averageDuration = durations.length ? Math.round(durations.reduce((total, item) => total + item, 0) / durations.length) : 0;
    return {
      total: logs.length,
      successRate: logs.length ? Math.round((successCount / logs.length) * 100) : 0,
      averageDuration
    };
  }, [logs]);

  function resetFilters() {
    setTask("");
    setStatus("");
    setTrigger("");
    setMethod("");
    setPage(1);
  }

  function logPayload(log: TaskLog) {
    return {
      request_headers: log.request_headers,
      request_body_preview: log.request_body_preview,
      response_headers: log.response_headers,
      response_body_preview: log.response_body_preview,
      error_message: log.error_message
    };
  }

  async function copyLog(log: TaskLog) {
    await navigator.clipboard?.writeText(JSON.stringify(logPayload(log), null, 2));
  }

  async function rerun(log: TaskLog) {
    setBusyTaskId(log.task_id);
    try {
      await api.runTask(log.task_id);
      await load();
    } finally {
      setBusyTaskId(null);
    }
  }

  function exportLogs() {
    const rows = [
      ["time", "task", "trigger", "method", "status", "duration_ms", "http_status", "error"],
      ...logs.map((log) => [
        new Date(log.started_at).toLocaleString(),
        log.task_name ?? `Task ${log.task_id}`,
        log.trigger_type,
        log.request_method ?? "-",
        log.status,
        String(log.duration_ms ?? "-"),
        String(log.http_status ?? "-"),
        log.error_message ?? "-"
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "http-runner-logs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <div className="log-summary-strip" aria-label={t("logs.summary.aria")}>
        <span>{t("logs.summary.total")} <strong>{stats.total}</strong></span>
        <span>{t("logs.summary.successRate")} <strong>{stats.successRate}%</strong></span>
        <span>{t("logs.summary.avgDuration")} <strong>{stats.averageDuration} ms</strong></span>
      </div>

      <section className="panel filter-panel">
        <div className="filters log-filters" aria-label={t("logs.filter.aria")}>
          <label className="search-field">
            <Search size={18} />
            <input placeholder={t("logs.search.placeholder")} value={task} onChange={(event) => updateFilter(setTask, event.target.value)} />
          </label>
          <select aria-label={t("logs.filter.allStatus")} value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>
            <option value="">{t("logs.filter.allStatus")}</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="error">error</option>
            <option value="timeout">timeout</option>
          </select>
          <select aria-label={t("logs.filter.allTriggers")} value={trigger} onChange={(event) => updateFilter(setTrigger, event.target.value)}>
            <option value="">{t("logs.filter.allTriggers")}</option>
            <option value="cron">cron</option>
            <option value="manual">manual</option>
            <option value="retry">retry</option>
          </select>
          <select aria-label={t("logs.filter.allMethods")} value={method} onChange={(event) => updateFilter(setMethod, event.target.value)}>
            <option value="">{t("logs.filter.allMethods")}</option>
            {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <div className="date-range" aria-label="日期范围">
            <Calendar size={17} />
            <span>{t("logs.filter.dateStart")}</span>
            <span>→</span>
            <span>{t("logs.filter.dateEnd")}</span>
          </div>
          <button className="button secondary filter-reset" type="button" onClick={resetFilters}>
            <RefreshCcw size={16} />
            {t("logs.filter.reset")}
          </button>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="panel-header compact-header">
          <div>
            <span className="toolbar-kicker">{t("logs.panel.kicker")}</span>
            <h2>{t("logs.panel.title")}</h2>
          </div>
          <button className="button secondary" type="button" onClick={exportLogs} disabled={!logs.length}>
            <Download size={16} />
            {t("logs.export")}
          </button>
        </div>

        <div className="table-panel">
          {loading ? (
            <div className="empty-state">{t("logs.loading")}</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-copy">
                <span className="empty-kicker">{t("logs.empty.kicker")}</span>
                <p>{t("logs.empty.title")}</p>
                <small>{t("logs.empty.description")}</small>
              </div>
            </div>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>{t("logs.table.time")}</th>
                  <th>{t("logs.table.task")}</th>
                  <th>{t("logs.table.trigger")}</th>
                  <th>{t("logs.table.method")}</th>
                  <th>{t("logs.table.status")}</th>
                  <th>{t("logs.table.duration")}</th>
                  <th>{t("logs.table.http")}</th>
                  <th>{t("logs.table.error")}</th>
                  <th>{t("logs.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="clickable-row"
                  >
                    <td>{new Date(log.started_at).toLocaleString()}</td>
                    <td>
                      <div className="task-cell">
                        <span>{log.task_name ?? `Task ${log.task_id}`}</span>
                        <small>#{log.task_id}</small>
                      </div>
                    </td>
                    <td>{log.trigger_type}</td>
                    <td><MethodBadge method={log.request_method} /></td>
                    <td>
                      <StatusBadge status={log.status} />
                    </td>
                    <td>{log.duration_ms !== null ? `${log.duration_ms} ms` : "-"}</td>
                    <td className={log.http_status && log.http_status < 400 ? "http-ok" : ""}>{log.http_status ?? "-"}</td>
                    <td className="truncate">{log.error_message ?? "-"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" type="button" title={t("logs.action.copy")} aria-label={t("logs.action.copyAria")} onClick={() => void copyLog(log)}>
                          <Copy size={16} />
                        </button>
                        <button className="icon-button" type="button" title={t("logs.action.rerun")} aria-label={t("logs.action.rerunAria")} onClick={() => void rerun(log)} disabled={busyTaskId === log.task_id}>
                          <RotateCcw size={16} />
                        </button>
                        <button className="icon-button" type="button" title={t("logs.action.detail")} aria-label={t("logs.action.detail")} onClick={() => setSelectedLog(log)}>
                          <Eye size={16} />
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
          <span>{t("logs.pagination.total", { count: logs.length })}</span>
          <div className="pagination">
            <button className="plain-page-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
              ‹
            </button>
            <span className="current-page">{page}</span>
            {hasNext && <button className="plain-page-button" type="button" onClick={() => setPage((value) => value + 1)}>{page + 1}</button>}
            <button className="plain-page-button" type="button" onClick={() => setPage((value) => value + 1)} disabled={!hasNext}>
              ›
            </button>
          </div>
          <span>{t("logs.pagination.size")}</span>
        </div>
      </section>

      {selectedLog && (
        <div className="modal-backdrop log-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedLog(null);
        }}>
          <section className="log-modal" aria-label={t("logs.detail.title")}>
            <div className="detail-panel-header">
              <div>
                <span className="toolbar-kicker">{t("logs.detail.kicker")}</span>
                <h3>{t("logs.detail.title")}</h3>
              </div>
              <button className="icon-button flat" type="button" title={t("logs.detail.close")} aria-label={t("logs.detail.close")} onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>
            <dl className="detail-list compact-list log-detail-grid">
              <div><dt>{t("logs.detail.task")}</dt><dd>{selectedLog.task_name ?? selectedLog.task_id}</dd></div>
              <div><dt>{t("logs.detail.trigger")}</dt><dd>{selectedLog.trigger_type}</dd></div>
              <div><dt>{t("logs.detail.method")}</dt><dd>{selectedLog.request_method ?? "-"}</dd></div>
              <div><dt>{t("logs.detail.status")}</dt><dd><StatusBadge status={selectedLog.status} /></dd></div>
              <div><dt>{t("logs.detail.http")}</dt><dd>{selectedLog.http_status ?? "-"}</dd></div>
              <div><dt>{t("logs.detail.duration")}</dt><dd>{selectedLog.duration_ms !== null ? `${selectedLog.duration_ms} ms` : "-"}</dd></div>
            </dl>
            <div className="response-label">{t("logs.detail.response")}</div>
            <div className="code-shell">
              <div className="code-toolbar">
                <span>{t("logs.detail.json")}</span>
                <div>
                  <button className="button secondary small" type="button" onClick={() => void copyLog(selectedLog)}>
                    <Copy size={14} />
                    {t("logs.detail.copy")}
                  </button>
                  <button className="button secondary small" type="button">
                    {t("logs.detail.expand")}
                  </button>
                </div>
              </div>
              <pre className="code-block">{JSON.stringify(logPayload(selectedLog), null, 2)}</pre>
            </div>
            <div className="dialog-actions">
              <button className="button secondary" type="button" onClick={() => setSelectedLog(null)}>
                {t("logs.detail.closeButton")}
              </button>
              <button className="button primary" type="button" onClick={() => void copyLog(selectedLog)}>
                {t("logs.detail.copyResponse")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
