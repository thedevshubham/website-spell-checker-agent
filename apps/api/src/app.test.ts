import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { findScan, startScanMock } = vi.hoisted(() => ({
  findScan: vi.fn(),
  startScanMock: vi.fn()
}));

vi.mock("./db.js", () => ({
  db: {
    scan: { findUnique: findScan },
    page: { findMany: vi.fn().mockResolvedValue([]) },
    issue: { findMany: vi.fn().mockResolvedValue([]) }
  }
}));

vi.mock("./scan-agent.js", () => ({ startScan: startScanMock }));

import { app } from "./app.js";

beforeEach(() => vi.clearAllMocks());

describe("scan API", () => {
  it("creates a scan", async () => {
    startScanMock.mockResolvedValue({ id: "scan-1", status: "running" });
    const response = await request(app).post("/api/scans").send({ startUrl: "https://example.com" });
    expect(response.status).toBe(202);
    expect(response.body.scan).toMatchObject({ id: "scan-1", status: "running" });
  });

  it("retrieves a scan", async () => {
    findScan.mockResolvedValue({ id: "scan-1", status: "completed" });
    const response = await request(app).get("/api/scans/scan-1");
    expect(response.status).toBe(200);
    expect(response.body.scan.id).toBe("scan-1");
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app).post("/api/scans").send({ startUrl: "not-a-url" });
    expect(response.status).toBe(400);
  });
});
