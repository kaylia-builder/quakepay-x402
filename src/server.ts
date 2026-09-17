import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const port = Number(process.env.PORT ?? 8080);
if (!Number.isSafeInteger(port) || port <= 0 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const app = createApp(config);
app.listen(port, () => {
  console.log(
    `quakepay-x402 listening on :${port} ` +
      `(network ${config.chain.network}, ${config.price} per call to ${config.payTo})`
  );
});
