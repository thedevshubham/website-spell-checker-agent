import { FormEvent, useState } from "react";
import { createScan } from "../api";

interface HomePageProps {
  onScanCreated: (scanId: string) => void;
}

export function HomePage({ onScanCreated }: HomePageProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setError("Enter a valid public http or https URL.");
      return;
    }

    try {
      setSubmitting(true);
      const scan = await createScan(url);
      onScanCreated(scan.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the scan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="home">
      <section className="hero">
        <p className="eyebrow">Website Spell Checker</p>
        <h1>Find writing mistakes across your website.</h1>
        <p className="intro">Enter a public URL. We scan up to ten static pages and show clear corrections.</p>
        <form onSubmit={submit}>
          <label htmlFor="website-url">Website URL</label>
          <div className="form-row">
            <input
              id="website-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              required
            />
            <button disabled={submitting}>{submitting ? "Starting…" : "Start scan"}</button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}
