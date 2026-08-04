import { useEffect, useMemo, useState } from "react";
import { apiUrl, getIssues, getPages, getScan } from "../api";
import type { Issue, Page, Scan } from "../types";

export function ScanPage({ scanId }: { scanId: string }) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pageFilter, setPageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: number | undefined;
    let active = true;

    async function load() {
      try {
        const nextScan = await getScan(scanId);
        if (!active) return;
        setScan(nextScan);
        if (nextScan.status === "running") timer = window.setTimeout(load, 2_000);
        else {
          const [nextPages, nextIssues] = await Promise.all([getPages(scanId), getIssues(scanId)]);
          if (active) {
            setPages(nextPages);
            setIssues(nextIssues);
          }
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load the scan.");
      }
    }

    void load();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [scanId]);

  const filteredIssues = useMemo(() => issues.filter((issue) =>
    (!pageFilter || issue.pageUrl === pageFilter) &&
    (!categoryFilter || issue.category === categoryFilter)
  ), [issues, pageFilter, categoryFilter]);

  if (error) return <main className="shell"><p className="error" role="alert">{error}</p><a href="/">Start again</a></main>;
  if (!scan) return <main className="shell"><p>Loading scan…</p></main>;

  const progress = scan.pagesDiscovered === 0 ? 0 : Math.round(scan.pagesProcessed / scan.pagesDiscovered * 100);

  return (
    <main className="shell">
      <header className="page-header">
        <div><a href="/" className="back">← New scan</a><h1>Scan report</h1><p className="url">{scan.startUrl}</p></div>
        <span className={`status ${scan.status}`}>{scan.status}</span>
      </header>

      <section className="summary" aria-label="Scan summary">
        <div><strong>{scan.pagesProcessed}</strong><span>Pages processed</span></div>
        <div><strong>{scan.pagesDiscovered}</strong><span>Pages discovered</span></div>
        <div><strong>{scan.issuesFound}</strong><span>Issues found</span></div>
      </section>

      {scan.status === "running" && <section className="progress-wrap">
        <div className="progress-label"><span>Checking website</span><span>{progress}%</span></div>
        <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      </section>}

      {scan.status === "failed" && <p className="error">{scan.errorMessage ?? "The scan failed."}</p>}

      {scan.status === "completed" && <>
        <section className="toolbar">
          <select aria-label="Filter by page" value={pageFilter} onChange={(event) => setPageFilter(event.target.value)}>
            <option value="">All pages</option>
            {pages.map((page) => <option key={page.id} value={page.url}>{page.url}</option>)}
          </select>
          <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            <option value="spelling">Spelling</option>
            <option value="grammar">Grammar</option>
            <option value="punctuation">Punctuation</option>
            <option value="word_choice">Word choice</option>
          </select>
          <a className="button-link" href={`${apiUrl}/api/scans/${scanId}/export.csv`}>Export CSV</a>
        </section>

        <section className="issues">
          {filteredIssues.length === 0 && <div className="empty"><h2>No issues found</h2><p>Try another page filter or scan a different website.</p></div>}
          {filteredIssues.map((issue) => <article className="issue" key={issue.id}>
            <div className="issue-top"><span className="category">{issue.category.replace("_", " ")}</span><span>{issue.elementType.replace("_", " ")}</span></div>
            <a href={issue.pageUrl} target="_blank" rel="noreferrer">{issue.pageUrl}</a>
            <p className="context">{issue.context}</p>
            <div className="correction"><span><small>Found</small>{issue.matchedText}</span><span className="arrow">→</span><span><small>Suggestion</small>{issue.suggestion ?? "No suggestion"}</span></div>
            <p className="source">Checked by {issue.source === "hybrid" ? "LanguageTool + AI" : "LanguageTool"}</p>
          </article>)}
        </section>
      </>}
    </main>
  );
}
