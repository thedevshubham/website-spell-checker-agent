import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { ScanPage } from "./pages/ScanPage";

export function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  const match = path.match(/^\/scans\/([^/]+)$/);
  if (match?.[1]) return <ScanPage scanId={match[1]} />;

  return <HomePage onScanCreated={(scanId) => {
    window.history.pushState({}, "", `/scans/${scanId}`);
    setPath(window.location.pathname);
  }} />;
}
