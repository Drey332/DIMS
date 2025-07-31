import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { Server } from "socket.io";

// ===== AI ERP Advisor (JS, CJS) =====
// TypeScript will whine, but this is industry-standard when mixing JS/TS
// @ts-ignore
import aiErpAdvisor from "./ai-erp-advisor.js";
const app = express();
const server = createServer(app);

// ===== Real-time Collaboration (Socket.IO) =====
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ===== LOGGING MIDDLEWARE (API tracing, CEO-friendly visibility) =====
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// ====== AI ERP ADVISOR ENDPOINT (Plug-and-Play for AI ERP Routing) ======
app.use("/api/ai-erp-advisor", aiErpAdvisor);

// ====== Register App’s API and Page Routes ======
(async () => {
  // Attach REST routes and all other project endpoints
  await registerRoutes(app);

  // ===== ERROR HANDLER (never crash the server, log all issues) =====
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // ====== Vite Setup (Frontend hot-reload in dev) =====
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ====== REALTIME SOCKET EVENTS ======
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Project-level rooms for live data updates
    socket.on("join-project", (projectId) => {
      socket.join(`project-${projectId}`);
      console.log(`Socket ${socket.id} joined project ${projectId}`);
    });
    socket.on("leave-project", (projectId) => {
      socket.leave(`project-${projectId}`);
      console.log(`Socket ${socket.id} left project ${projectId}`);
    });

    socket.on("team-update", (data) => {
      socket.to(`project-${data.projectId}`).emit("team-update", data);
    });
    socket.on("incident-update", (data) => {
      socket.to(`project-${data.projectId}`).emit("incident-update", data);
    });
    socket.on("asset-update", (data) => {
      socket.to(`project-${data.projectId}`).emit("asset-update", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // ====== STARTUP ======
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 HydroSafe API/AI/Socket server running on port ${port}`);
  });
})();