import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => c.text("Hono fixture"));
app.get("/api/health", (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: 3000 });
