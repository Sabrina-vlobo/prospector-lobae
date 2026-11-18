import { createApp } from "./app.js";
import { env } from "./env.js";

createApp().listen(env.API_PORT, () => {
  console.log(`API do LOBAE° Prospector em http://localhost:${env.API_PORT}`);
});
