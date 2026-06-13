import { useMemo, useState } from "react";
import { ApiClient } from "./api";
import { Layout, type AppRoute } from "./components/Layout";
import { useTranslation } from "./i18n";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TasksPage } from "./pages/TasksPage";

export function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [route, setRoute] = useState<AppRoute>("tasks");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const api = useMemo(() => {
    if (!token) return null;
    return new ApiClient(token, () => {
      sessionStorage.removeItem("admin_token");
      setToken("");
      setRoute("tasks");
      setTaskId(null);
      setError(t("session.expired"));
    });
  }, [token, t]);

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

  const title = route === "tasks" ? t("route.tasks") : route === "task-detail" ? `${t("route.taskDetail")}${taskId ?? ""}` : t("route.logs");

  return (
    <Layout
      route={route}
      title={title}
      onRouteChange={(next) => {
        setRoute(next);
        if (next !== "task-detail") setTaskId(null);
      }}
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
    </Layout>
  );
}
