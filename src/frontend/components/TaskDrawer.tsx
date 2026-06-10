import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { BODY_TYPES, DEFAULT_TASK_VALUES, HTTP_METHODS } from "../../shared/constants";
import type { BodyType, HttpMethod, TaskDetail, TaskInput } from "../../shared/types";
import { HeaderEditor } from "./HeaderEditor";

type TaskDrawerProps = {
  task: TaskDetail | null;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<Record<string, string> | null>;
};

function initialInput(task: TaskDetail | null): TaskInput {
  return {
    name: task?.name ?? "",
    url: task?.url ?? "",
    method: task?.method ?? DEFAULT_TASK_VALUES.method,
    headers: task?.headers ?? {},
    body: task?.body ?? "",
    body_type: task?.body_type ?? DEFAULT_TASK_VALUES.body_type,
    interval_minutes: task?.interval_minutes ?? DEFAULT_TASK_VALUES.interval_minutes,
    timeout_ms: task?.timeout_ms ?? DEFAULT_TASK_VALUES.timeout_ms,
    max_retries: task?.max_retries ?? DEFAULT_TASK_VALUES.max_retries,
    enabled: task?.enabled ?? DEFAULT_TASK_VALUES.enabled,
    notes: task?.notes ?? ""
  };
}

export function TaskDrawer({ task, onClose, onSubmit }: TaskDrawerProps) {
  const [input, setInput] = useState<TaskInput>(() => initialInput(task));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const title = task ? "编辑任务" : "新建任务";
  const bodyDisabled = input.method === "GET" || input.method === "HEAD";

  useEffect(() => {
    setInput(initialInput(task));
    setFieldErrors({});
  }, [task]);

  const jsonError = useMemo(() => {
    if (input.body_type !== "json" || !input.body) return null;
    try {
      JSON.parse(input.body);
      return null;
    } catch {
      return "JSON 格式无效";
    }
  }, [input.body, input.body_type]);

  async function submit() {
    if (jsonError) {
      setFieldErrors({ body: jsonError });
      return;
    }

    setBusy(true);
    const errors = await onSubmit({
      ...input,
      body: bodyDisabled || !input.body ? null : input.body,
      notes: input.notes || null
    });
    setBusy(false);

    if (errors) {
      setFieldErrors(errors);
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside className="task-drawer" aria-label={title}>
        <div className="drawer-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" title="关闭" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <section className="form-section">
            <h3>基础信息</h3>
            {fieldErrors.form && <span className="field-error">{fieldErrors.form}</span>}
            <label>
              Name
              <input value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </label>
            <label>
              Notes
              <textarea rows={3} value={input.notes ?? ""} onChange={(event) => setInput({ ...input, notes: event.target.value })} />
            </label>
            <label className="switch-row">
              <input type="checkbox" checked={input.enabled} onChange={(event) => setInput({ ...input, enabled: event.target.checked })} />
              Enabled
            </label>
          </section>

          <section className="form-section">
            <h3>请求配置</h3>
            <div className="inline-fields">
              <label>
                Method
                <select value={input.method} onChange={(event) => setInput({ ...input, method: event.target.value as HttpMethod })}>
                  {HTTP_METHODS.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
              <label>
                Body Type
                <select value={input.body_type} onChange={(event) => setInput({ ...input, body_type: event.target.value as BodyType })}>
                  {BODY_TYPES.map((bodyType) => <option key={bodyType}>{bodyType}</option>)}
                </select>
              </label>
            </div>
            <label>
              URL
              <input value={input.url} onChange={(event) => setInput({ ...input, url: event.target.value })} />
              {fieldErrors.url && <span className="field-error">{fieldErrors.url}</span>}
            </label>
            <label>
              Headers
              <HeaderEditor value={input.headers} onChange={(headers) => setInput({ ...input, headers })} />
              {fieldErrors.headers && <span className="field-error">{fieldErrors.headers}</span>}
            </label>
            <label>
              Body
              <textarea
                rows={7}
                value={input.body ?? ""}
                disabled={bodyDisabled}
                onChange={(event) => setInput({ ...input, body: event.target.value })}
              />
              {(fieldErrors.body || jsonError) && <span className="field-error">{fieldErrors.body ?? jsonError}</span>}
            </label>
          </section>

          <section className="form-section">
            <h3>调度配置</h3>
            <div className="inline-fields">
              <label>
                Interval Minutes
                <input
                  type="number"
                  min={1}
                  value={input.interval_minutes}
                  onChange={(event) => setInput({ ...input, interval_minutes: Number(event.target.value) })}
                />
                {fieldErrors.interval_minutes && <span className="field-error">{fieldErrors.interval_minutes}</span>}
              </label>
              <label>
                Timeout
                <input
                  type="number"
                  min={1000}
                  max={60000}
                  step={1000}
                  value={input.timeout_ms}
                  onChange={(event) => setInput({ ...input, timeout_ms: Number(event.target.value) })}
                />
                {fieldErrors.timeout_ms && <span className="field-error">{fieldErrors.timeout_ms}</span>}
              </label>
              <label>
                Max Retries
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={input.max_retries}
                  onChange={(event) => setInput({ ...input, max_retries: Number(event.target.value) })}
                />
              </label>
            </div>
          </section>
        </div>

        <div className="drawer-actions">
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="button primary" type="button" onClick={submit} disabled={busy}>
            {busy ? "保存中" : "保存"}
          </button>
        </div>
      </aside>
    </div>
  );
}
