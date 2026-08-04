import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  LANGUAGETOOL_URL: z.string().url().default("http://localhost:8010"),
  LANGUAGETOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  CRAWL_MAX_PAGES: z.coerce.number().int().positive().default(10),
  PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(5_000_000)
});

const environment = environmentSchema.parse(process.env);

export const config = {
  apiPort: environment.API_PORT,
  languageToolUrl: environment.LANGUAGETOOL_URL,
  languageToolTimeoutMs: environment.LANGUAGETOOL_TIMEOUT_MS,
  crawlMaxPages: environment.CRAWL_MAX_PAGES,
  pageTimeoutMs: environment.PAGE_TIMEOUT_MS,
  maxResponseBytes: environment.MAX_RESPONSE_BYTES
};
