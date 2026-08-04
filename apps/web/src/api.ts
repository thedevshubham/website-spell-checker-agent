import type { Issue, Page, Scan } from "./types";

export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export async function createScan(startUrl: string): Promise<Scan> {
  const result = await request<{ scan: Scan }>("/api/scans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startUrl })
  });
  return result.scan;
}

export async function getScan(id: string): Promise<Scan> {
  return (await request<{ scan: Scan }>(`/api/scans/${id}`)).scan;
}

export async function getPages(id: string): Promise<Page[]> {
  return (await request<{ items: Page[] }>(`/api/scans/${id}/pages`)).items;
}

export async function getIssues(id: string): Promise<Issue[]> {
  return (await request<{ items: Issue[] }>(`/api/scans/${id}/issues`)).items;
}
