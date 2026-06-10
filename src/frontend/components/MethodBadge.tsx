import type { HttpMethod } from "../../shared/types";

export function MethodBadge({ method }: { method: HttpMethod | null }) {
  return <span className="method-badge">{method ?? "-"}</span>;
}
