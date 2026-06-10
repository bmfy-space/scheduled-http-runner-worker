type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel, busy = false }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button className="button danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "处理中" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
