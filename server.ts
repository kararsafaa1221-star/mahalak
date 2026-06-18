import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import axios from "axios";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === "production";

  app.use(cors());
  app.use(express.json());

  app.get("/api/otp/health", (_req, res) => {
    res.json({ success: true, status: "Server is reachable", timestamp: new Date().toISOString() });
  });

  app.post("/api/onesignal", async (req, res) => {
    if (isProduction) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!restApiKey) {
      res.status(503).json({ error: "OneSignal is not configured on the server" });
      return;
    }

    try {
      const response = await axios.post("https://onesignal.com/api/v1/notifications", req.body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${restApiKey}`,
      },
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status === 403 ? 400 : (error.response?.status || 400);
      res.status(status).json({ error: error.response?.data || error.message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
  });
}

startServer();
