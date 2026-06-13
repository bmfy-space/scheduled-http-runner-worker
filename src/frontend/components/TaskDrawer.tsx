import { useEffect, useMemo, useState } from "react";
import { Clock3, Power, Save, X } from "lucide-react";
import { BODY_TYPES, DEFAULT_TASK_VALUES, HTTP_METHODS } from "../../shared/constants";
import type { BodyType, HttpMethod, TaskDetail, TaskInput } from "../../shared/types";
import { useTranslation } from "../i18n";
import { HeaderEditor } from "./HeaderEditor";
import { CurlImportButton } from "./CurlImportButton";

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
  const { t } = useTranslation();
  const title = task ? t("drawer.title.edit") : t("drawer.title.create");
  const bodyDisabled = input.method === "GET" || input.method === "HEAD";
  const dirty = useMemo(() => JSON.stringify(input) !== JSON.stringify(initialInput(task)), [input, task]);

  useEffect(() => {
    setInput(initialInput(task));
    setFieldErrors({});
  }, [task]);

  function tryClose() {
    if (dirty && !window.confirm(t("drawer.unsavedConfirm"))) return;
    onClose();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        tryClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, input]);

  function handleCurlImport(parsed: Partial<TaskInput>) {
    setInput((prev) => ({
      ...prev,
      url: parsed.url ?? prev.url,
      method: parsed.method ?? prev.method,
      headers: parsed.headers ?? prev.headers,
      body: parsed.body ?? prev.body,
      body_type: parsed.body_type ?? prev.body_type,
    }));
  }

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
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) tryClose();
    }}>
      <aside className="task-drawer" aria-label={title}>
        <div className="drawer-header">
          <div>
            <span className="drawer-kicker">{task ? `${t("drawer.kicker.edit")}${task.id}` : t("drawer.kicker.create")}</span>
            <h2>{title}</h2>
            <p>{t("drawer.description")}</p>
          </div>
          <button className="icon-button" type="button" title={t("drawer.close")} aria-label={t("drawer.close")} onClick={tryClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-main">
            <section className="form-section">
              <h3>{t("drawer.section.basic")}</h3>
              {fieldErrors.form && <span className="field-error">{fieldErrors.form}</span>}
              <label>
                {t("drawer.label.name")}
                <input placeholder={t("drawer.placeholder.name")} value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </label>
              <label>
                {t("drawer.label.notes")}
                <textarea rows={3} placeholder={t("drawer.placeholder.notes")} value={input.notes ?? ""} onChange={(event) => setInput({ ...input, notes: event.target.value })} />
              </label>
            </section>

            <section className="form-section">
              <div className="curl-import-row">
                <h3>{t("drawer.section.request")}</h3>
                <CurlImportButton onImport={handleCurlImport} />
              </div>
              <div className="inline-fields">
                <label>
                  {t("drawer.label.method")}
                  <select value={input.method} onChange={(event) => setInput({ ...input, method: event.target.value as HttpMethod })}>
                    {HTTP_METHODS.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
                <label>
                  {t("drawer.label.bodyType")}
                  <select value={input.body_type} onChange={(event) => setInput({ ...input, body_type: event.target.value as BodyType })}>
                    {BODY_TYPES.map((bodyType) => <option key={bodyType}>{bodyType}</option>)}
                  </select>
                </label>
              </div>
              <label>
                {t("drawer.label.url")}
                <input placeholder={t("drawer.placeholder.url")} value={input.url} onChange={(event) => setInput({ ...input, url: event.target.value })} />
                {fieldErrors.url && <span className="field-error">{fieldErrors.url}</span>}
              </label>
              <label>
                {t("drawer.label.headers")}
                <HeaderEditor value={input.headers} onChange={(headers) => setInput({ ...input, headers })} />
                {fieldErrors.headers && <span className="field-error">{fieldErrors.headers}</span>}
              </label>
              <label>
                {t("drawer.label.body")}
                <textarea
                  rows={9}
                  placeholder={t("drawer.placeholder.body")}
                  value={input.body ?? ""}
                  disabled={bodyDisabled}
                  onChange={(event) => setInput({ ...input, body: event.target.value })}
                />
                {bodyDisabled && <span className="field-hint">{t("drawer.hint.bodyDisabled")}</span>}
                {(fieldErrors.body || jsonError) && <span className="field-error">{fieldErrors.body ?? jsonError}</span>}
              </label>
            </section>
          </div>

          <aside className="drawer-rail" aria-label={t("drawer.section.schedule.aria")}>
            <section className="form-section sticky-section">
              <div className="rail-heading">
                <Clock3 size={18} />
                <h3>{t("drawer.section.schedule")}</h3>
              </div>
              <label className="switch-card">
                <span>
                  {input.enabled ? t("drawer.schedule.enabled") : t("drawer.schedule.disabled")}
                </span>
                <input type="checkbox" checked={input.enabled} onChange={(event) => setInput({ ...input, enabled: event.target.checked })} />
              </label>
              <label>
                {t("drawer.label.interval")}
                <input
                  type="number"
                  min={1}
                  value={input.interval_minutes}
                  onChange={(event) => setInput({ ...input, interval_minutes: Number(event.target.value) })}
                />
                {fieldErrors.interval_minutes && <span className="field-error">{fieldErrors.interval_minutes}</span>}
              </label>
              <label>
                {t("drawer.label.timeout")}
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
                {t("drawer.label.maxRetries")}
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={input.max_retries}
                  onChange={(event) => setInput({ ...input, max_retries: Number(event.target.value) })}
                />
              </label>
              <div className="run-summary">
                <span><Power size={16} /> {t("drawer.preview.title")}</span>
                <strong>{input.enabled ? t("drawer.preview.enabled", { minutes: input.interval_minutes || 0 }) : t("drawer.preview.disabled")}</strong>
                <small>{t("drawer.preview.details", { timeout: input.timeout_ms || 0, retries: input.max_retries || 0 })}</small>
              </div>
            </section>
          </aside>
        </div>

        <div className="drawer-actions">
          <span className={dirty ? "dirty-indicator active" : "dirty-indicator"}>{dirty ? t("drawer.dirty.active") : t("drawer.dirty.clean")}</span>
          <button className="button secondary" type="button" onClick={tryClose} disabled={busy}>
            {t("drawer.cancel")}
          </button>
          <button className="button primary" type="button" onClick={submit} disabled={busy}>
            <Save size={16} />
            {busy ? t("drawer.saving") : t("drawer.save")}
          </button>
        </div>
      </aside>
    </div>
  );
}
