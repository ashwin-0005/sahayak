import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import authRouter from "./routes/auth.js";
import dueRouter from "./routes/due.js";
import healthRouter from "./routes/health.js";
import patientsRouter from "./routes/patients.js";
import remindersRouter from "./routes/reminders.js";
import riskRouter from "./routes/risk.js";
import syncRouter from "./routes/sync.js";
import visitsRouter from "./routes/visits.js";

export function createApp(): express.Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));
  // Log method+url+status only; never log bodies (may contain names/phones).
  app.use(pinoHttp({ autoLogging: true, quietReqLogger: true } as never));

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/patients", patientsRouter);
  app.use("/api/visits", visitsRouter);
  app.use("/api/due", dueRouter);
  app.use("/api/risk", riskRouter);
  app.use("/api/reminders", remindersRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
