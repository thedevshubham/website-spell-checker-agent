import { app } from "./app.js";
import { config } from "./config.js";

app.listen(config.apiPort, () => {
  console.info(`API listening on http://localhost:${config.apiPort}`);
});
