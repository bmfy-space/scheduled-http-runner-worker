import { FormEvent, useState } from "react";
import { KeyRound, Timer } from "lucide-react";
import { useTranslation } from "../i18n";

type LoginPageProps = {
  onLogin: (token: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${trimmed}` },
      });

      if (res.ok) {
        onLogin(trimmed);
      } else if (res.status === 401) {
        setError(t("login.error.invalid"));
      } else {
        setError(t("login.error.server"));
      }
    } catch {
      setError(t("login.error.network"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-stage" aria-label={t("login.aria")}>
        <div className="login-editorial">
          <div className="login-brand-row">
            <span className="brand-mark dark">
              <Timer size={18} />
            </span>
            <span>{t("login.brand")}</span>
          </div>
          <p className="login-eyebrow">{t("login.eyebrow")}</p>
          <h2>{t("login.description")}</h2>
        </div>
        <form className="login-panel" onSubmit={submit}>
          <div className="login-mark">
            <KeyRound size={22} />
          </div>
          <h1>{t("login.title")}</h1>
          {error && <div className="error-banner">{error}</div>}
          <label>
            {t("login.tokenLabel")}
            <input
              type="password"
              autoFocus
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button className="button primary" type="submit" disabled={!token.trim() || loading}>
            {loading ? t("login.verifying") : t("login.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
