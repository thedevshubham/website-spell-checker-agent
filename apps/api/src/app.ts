import express from "express";
import { ZodError } from "zod";
import { scansRouter } from "./routes/scans.js";

export const app = express();
app.use(express.json());
app.use("/api/scans", scansRouter);

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.issues });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  const isInputError = message.includes("URL") || message.includes("http") || message.includes("private");
  console.error({ stage: "request", error: message });
  response.status(isInputError ? 400 : 500).json({ error: isInputError ? message : "Unexpected server error" });
});
