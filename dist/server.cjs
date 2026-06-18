"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_cors = __toESM(require("cors"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const isProduction = process.env.NODE_ENV === "production";
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/otp/health", (_req, res) => {
    res.json({ success: true, status: "Server is reachable", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
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
      const response = await import_axios.default.post("https://onesignal.com/api/v1/notifications", req.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Key ${restApiKey}`
        }
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status === 403 ? 400 : error.response?.status || 400;
      res.status(status).json({ error: error.response?.data || error.message });
    }
  });
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
