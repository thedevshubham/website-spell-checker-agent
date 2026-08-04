import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  LANGUAGETOOL_URL: z.string().url().default("http://localhost:8010"),
  LANGUAGETOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  CRAWL_MAX_PAGES: z.coerce.number().int().positive().default(10),
  PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(5_000_000),
  OLLAMA_ENABLED: z.enum(["true", "false"]).default("false"),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).default("qwen3.5:4b"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000)
});

const environment = environmentSchema.parse(process.env);

export const config = {
  apiPort: environment.API_PORT,
  webUrl: environment.WEB_URL,
  languageToolUrl: environment.LANGUAGETOOL_URL,
  languageToolTimeoutMs: environment.LANGUAGETOOL_TIMEOUT_MS,
  crawlMaxPages: environment.CRAWL_MAX_PAGES,
  pageTimeoutMs: environment.PAGE_TIMEOUT_MS,
  maxResponseBytes: environment.MAX_RESPONSE_BYTES,
  ollamaEnabled: environment.OLLAMA_ENABLED === "true",
  ollamaUrl: environment.OLLAMA_URL,
  ollamaModel: environment.OLLAMA_MODEL,
  ollamaTimeoutMs: environment.OLLAMA_TIMEOUT_MS
};
