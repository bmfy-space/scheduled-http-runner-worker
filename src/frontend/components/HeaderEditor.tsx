import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isSensitiveHeaderKey } from "../../worker/validation";

type HeaderRow = {
  id: string;
  key: string;
  value: string;
};

type HeaderEditorProps = {
  value: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
};

function toRows(value: Record<string, string>): HeaderRow[] {
  const rows = Object.entries(value).map(([key, headerValue], index) => ({ id: `${key}-${index}`, key, value: headerValue }));
  return rows.length ? rows : [{ id: "empty-0", key: "", value: "" }];
}

function rowsToHeaders(rows: HeaderRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]));
}

export function HeaderEditor({ value, onChange }: HeaderEditorProps) {
  const [rows, setRows] = useState<HeaderRow[]>(() => toRows(value));
  const lastSerialized = useRef(JSON.stringify(value));

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastSerialized.current) {
      lastSerialized.current = serialized;
      setRows(toRows(value));
    }
  }, [value]);

  function update(nextRows: HeaderRow[]) {
    setRows(nextRows.length ? nextRows : [{ id: crypto.randomUUID(), key: "", value: "" }]);
    const nextHeaders = rowsToHeaders(nextRows);
    lastSerialized.current = JSON.stringify(nextHeaders);
    onChange(nextHeaders);
  }

  return (
    <div className="header-editor">
      {rows.map((row, index) => (
        <div className="header-row" key={row.id}>
          <input
            aria-label={`Header ${index + 1} key`}
            placeholder="Header"
            value={row.key}
            onChange={(event) => {
              const nextRows = rows.map((candidate, candidateIndex) =>
                candidateIndex === index ? { ...candidate, key: event.target.value } : candidate
              );
              update(nextRows);
            }}
          />
          <input
            aria-label={`Header ${index + 1} value`}
            placeholder={isSensitiveHeaderKey(row.key) ? "Sensitive value" : "Value"}
            value={row.value}
            onChange={(event) => {
              const nextRows = rows.map((candidate, candidateIndex) =>
                candidateIndex === index ? { ...candidate, value: event.target.value } : candidate
              );
              update(nextRows);
            }}
          />
          <span className="sensitive-chip">{isSensitiveHeaderKey(row.key) ? "敏感" : ""}</span>
          <button
            className="icon-button"
            type="button"
            title="删除 Header"
            aria-label="删除 Header"
            onClick={() => update(rows.filter((_, candidateIndex) => candidateIndex !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="button secondary small"
        type="button"
        onClick={() => update([...rows, { id: crypto.randomUUID(), key: "", value: "" }])}
      >
        添加 Header
      </button>
    </div>
  );
}
