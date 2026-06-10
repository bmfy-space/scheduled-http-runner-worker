import { Activity, FileText, LogOut, RefreshCcw, Settings, Timer } from "lucide-react";
import type { ReactNode } from "react";

export type AppRoute = "tasks" | "task-detail" | "logs" | "settings";

type LayoutProps = {
  route: AppRoute;
  title: string;
  onRouteChange: (route: AppRoute) => void;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function Layout({ route, title, onRouteChange, onRefresh, onLogout, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Timer size={22} />
          <span>HTTP Runner</span>
        </div>
        <nav className="nav-list" aria-label="主导航">
          <button className={route === "tasks" || route === "task-detail" ? "active" : ""} type="button" onClick={() => onRouteChange("tasks")}>
            <Activity size={17} />
            任务管理
          </button>
          <button className={route === "logs" ? "active" : ""} type="button" onClick={() => onRouteChange("logs")}>
            <FileText size={17} />
            执行日志
          </button>
          <button className={route === "settings" ? "active" : ""} type="button" onClick={() => onRouteChange("settings")}>
            <Settings size={17} />
            系统设置
          </button>
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-actions">
            <button className="icon-button" type="button" title="刷新" aria-label="刷新" onClick={onRefresh}>
              <RefreshCcw size={17} />
            </button>
            <span className="admin-pill">Admin</span>
            <button className="icon-button" type="button" title="退出" aria-label="退出" onClick={onLogout}>
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
