import { useMemo, useState } from "react";
import { ApiClient } from "./api";
import { Layout, type AppRoute } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TasksPage } from "./pages/TasksPage";

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [route, setRoute] = useState<AppRoute>("tasks");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => {
    if (!token) return null;
    return new ApiClient(token, () => {
      sessionStorage.removeItem("admin_token");
      setToken("");
      setRoute("tasks");
      setTaskId(null);
      setError("登录已失效");
    });
  }, [token]);

  function login(nextToken: string) {
    sessionStorage.setItem("admin_token", nextToken);
    setToken(nextToken);
    setError(null);
  }

  function logout() {
    sessionStorage.removeItem("admin_token");
    setToken("");
    setTaskId(null);
    setRoute("tasks");
  }

  if (!api) {
    return <LoginPage onLogin={login} />;
  }

  const title = route === "tasks" ? "任务管理" : route === "task-detail" ? `任务详情 #${taskId ?? ""}` : route === "logs" ? "执行日志" : "系统设置";

  return (
    <Layout
      route={route}
      title={title}
      onRouteChange={(next) => {
        setRoute(next);
        if (next !== "task-detail") setTaskId(null);
      }}
      onRefresh={() => setRefreshKey((value) => value + 1)}
      onLogout={logout}
    >
      {error && <div className="error-banner">{error}</div>}
      {route === "tasks" && (
        <TasksPage api={api} refreshKey={refreshKey} onOpenTaskDetail={(id) => {
          setTaskId(id);
          setRoute("task-detail");
        }} />
      )}
      {route === "task-detail" && taskId && (
        <TaskDetailPage
          api={api}
          taskId={taskId}
          refreshKey={refreshKey}
          onBack={() => setRoute("tasks")}
          onRefresh={() => setRefreshKey((value) => value + 1)}
        />
      )}
      {route === "logs" && <LogsPage api={api} refreshKey={refreshKey} />}
      {route === "settings" && <SettingsPage />}
    </Layout>
  );
}
