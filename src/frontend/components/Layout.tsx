import { Activity, FileText, Globe, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation, type Lang } from "../i18n";

export type AppRoute = "tasks" | "task-detail" | "logs";

type LayoutProps = {
  route: AppRoute;
  title: string;
  onRouteChange: (route: AppRoute) => void;
  onLogout: () => void;
  children: ReactNode;
};

const subtitleKeys: Record<AppRoute, string> = {
  tasks: "subtitle.tasks",
  "task-detail": "subtitle.taskDetail",
  logs: "subtitle.logs"
};

export function Layout({ route, title, onRouteChange, onLogout, children }: LayoutProps) {
  const { lang, setLang, t } = useTranslation();

  function toggleLang() {
    setLang(lang === "zh" ? "en" : "zh");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="nav-list" aria-label={t("nav.aria")}>
          <button className={route === "tasks" || route === "task-detail" ? "active" : ""} type="button" onClick={() => onRouteChange("tasks")}>
            <Activity size={17} />
            {t("nav.tasks")}
          </button>
          <button className={route === "logs" ? "active" : ""} type="button" onClick={() => onRouteChange("logs")}>
            <FileText size={17} />
            {t("nav.logs")}
          </button>
        </nav>
        <button className="nav-logout" type="button" onClick={onLogout}>
          <LogOut size={17} />
          {t("nav.logout")}
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="lang-toggle" type="button" onClick={toggleLang} title={lang === "zh" ? "Switch to English" : "切换为中文"} aria-label={lang === "zh" ? "Switch to English" : "切换为中文"}>
              <Globe size={15} />
              <span>{lang === "zh" ? "EN" : "ZH"}</span>
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>{t(subtitleKeys[route])}</p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
