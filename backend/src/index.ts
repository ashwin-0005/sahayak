import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb } from "./db/client.js";

getDb(); // ensure schema exists
const app = createApp();

// Bind all interfaces so the server is reachable on hosting platforms.
// Port comes from the environment via config (PORT, default 4000).
const host = process.env.HOST ?? "0.0.0.0";
app.listen(config.port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Sahayak backend listening on ${host}:${config.port}`);
});
