export interface Scan {
  id: string;
  startUrl: string;
  status: "running" | "completed" | "failed";
  pagesDiscovered: number;
  pagesProcessed: number;
  issuesFound: number;
  errorMessage?: string | null;
}

export interface Page {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed";
}

export interface Issue {
  id: string;
  pageUrl: string;
  elementType: string;
  originalText: string;
  matchedText: string;
  suggestion?: string | null;
  category: "spelling" | "grammar" | "punctuation" | "word_choice";
  context: string;
  source: "languagetool" | "ollama" | "hybrid";
}
