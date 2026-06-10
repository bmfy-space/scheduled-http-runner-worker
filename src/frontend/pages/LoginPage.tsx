import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";

type LoginPageProps = {
  onLogin: (token: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [token, setToken] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (token.trim()) onLogin(token.trim());
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-mark">
          <KeyRound size={26} />
        </div>
        <h1>定时 HTTP 请求平台</h1>
        <label>
          Admin Token
          <input
            type="password"
            autoFocus
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={!token.trim()}>
          登录
        </button>
      </form>
    </main>
  );
}
