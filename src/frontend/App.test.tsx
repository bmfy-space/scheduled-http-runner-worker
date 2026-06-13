import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LangProvider } from "./i18n";
import { App } from "./App";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderApp() {
  return render(
    <LangProvider>
      <App />
    </LangProvider>
  );
}

describe("App", () => {
  it("renders the login screen without a token", () => {
    renderApp();

    expect(screen.getByText("Scheduled HTTP Runner")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin Token")).toBeInTheDocument();
  });

  it("enters the task page after login", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/login") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }) as unknown as typeof fetch);

    renderApp();

    fireEvent.change(screen.getByLabelText("Admin Token"), { target: { value: "local-token" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In|登录/ }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /Tasks|任务管理/ })).toBeInTheDocument());
    expect(screen.getByText(/No tasks yet|暂无任务/)).toBeInTheDocument();
  });
});
