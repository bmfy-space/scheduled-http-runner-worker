import { useState } from "react";
import { ClipboardPaste, X } from "lucide-react";
import type { TaskInput } from "../../shared/types";
import { useTranslation } from "../i18n";
import { parseCurl, CurlParseError } from "../utils/curl-parser";

type CurlImportButtonProps = {
  onImport: (input: Partial<TaskInput>) => void;
};

export function CurlImportButton({ onImport }: CurlImportButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  function handleImport() {
    try {
      const parsed = parseCurl(text);
      onImport(parsed);
      setOpen(false);
      setText("");
      setError(null);
    } catch (err) {
      if (err instanceof CurlParseError) {
        setError(err.message);
      } else {
        setError(t("curlImport.error.parse"));
      }
    }
  }

  function handleClose() {
    setOpen(false);
    setText("");
    setError(null);
  }

  return (
    <>
      <button className="button secondary" type="button" onClick={() => setOpen(true)}>
        <ClipboardPaste size={16} />
        {t("curlImport.button")}
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) handleClose();
        }}>
          <section className="curl-import-modal" aria-label={t("curlImport.title")}>
            <div className="detail-panel-header">
              <div>
                <span className="toolbar-kicker">{t("curlImport.kicker")}</span>
                <h3>{t("curlImport.title")}</h3>
              </div>
              <button className="icon-button flat" type="button" title={t("curlImport.close")} aria-label={t("curlImport.close")} onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            <textarea
              className="curl-input"
              rows={8}
              placeholder={t("curlImport.placeholder")}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
            />

            {error && <div className="curl-import-error">{error}</div>}

            <div className="dialog-actions">
              <button className="button secondary" type="button" onClick={handleClose}>
                {t("curlImport.cancel")}
              </button>
              <button className="button primary" type="button" onClick={handleImport} disabled={!text.trim()}>
                {t("curlImport.import")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
