import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

const { createScan } = vi.hoisted(() => ({ createScan: vi.fn() }));
vi.mock("../api", () => ({ createScan }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("HomePage", () => {
  it("shows a validation error for an unsupported URL", () => {
    render(<HomePage onScanCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Website URL"), { target: { value: "ftp://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Start scan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("valid public http or https URL");
  });

  it("starts a scan and navigates to its report", async () => {
    createScan.mockResolvedValue({ id: "scan-1", status: "running" });
    const onScanCreated = vi.fn();
    render(<HomePage onScanCreated={onScanCreated} />);
    fireEvent.change(screen.getByLabelText("Website URL"), { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Start scan" }));
    await waitFor(() => expect(onScanCreated).toHaveBeenCalledWith("scan-1"));
  });
});
