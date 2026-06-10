import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the login screen without a token", () => {
    render(<App />);

    expect(screen.getByText("定时 HTTP 请求平台")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin Token")).toBeInTheDocument();
  });

  it("enters the task page after login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 })) as unknown as typeof fetch);
    render(<App />);

    fireEvent.change(screen.getByLabelText("Admin Token"), { target: { value: "local-token" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "任务管理" })).toBeInTheDocument());
    expect(screen.getByText("暂无任务")).toBeInTheDocument();
  });
});
