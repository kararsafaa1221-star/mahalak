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
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_axios = __toESM(require("axios"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/otp/health", (req, res) => {
    res.json({ success: true, status: "Server is reachable", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/otp", async (req, res) => {
    const { phone, text } = req.body;
    const WAS_API_KEY = process.env.WASENDER_ACCESS_TOKEN || "61af7f2a07544f59a208444cf80d5ce717be01ad0b571a13a4f9c3ab5209af21";
    const WAS_INSTANCE_ID = process.env.WASENDER_INSTANCE_ID || "83337";
    const API_URL = "https://wasenderapi.com/api/send-message";
    try {
      let cleaned = phone.replace(/\D/g, "");
      let formattedNumber = cleaned;
      if (cleaned.startsWith("07")) {
        formattedNumber = "964" + cleaned.substring(1);
      } else if (cleaned.startsWith("7")) {
        formattedNumber = "964" + cleaned;
      } else if (!cleaned.startsWith("964")) {
        formattedNumber = "964" + cleaned;
      }
      console.log(`\u{1F680} Sending OTP via Wasender to ${formattedNumber} (Session: ${WAS_INSTANCE_ID})`);
      const response = await import_axios.default.post(API_URL, {
        whatsapp_session: WAS_INSTANCE_ID,
        to: formattedNumber,
        text
      }, {
        headers: {
          "Authorization": `Bearer ${WAS_API_KEY}`,
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        timeout: 15e3
      });
      console.log("\u2705 Wasender Response:", response.data);
      res.json({ success: true, data: response.data });
    } catch (error) {
      const errorData = error.response?.data || error.message;
      console.error("\u274C Wasender Error Details:", errorData);
      res.status(500).json({
        success: false,
        error: errorData,
        hint: "\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0648\u0627\u0641\u0642 \u0625\u0639\u062F\u0627\u062F\u0627\u062A WASender \u0645\u0639 \u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0648\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0634\u062A\u063A\u0627\u0644 \u0627\u0644\u0640 Instance"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
