import { createApp } from "./app.js";
import { env } from "./env.js";

createApp().listen(env.PORT, () => {
  console.log(`API do LOBAE° Prospector em http://localhost:${env.PORT}`);
});
