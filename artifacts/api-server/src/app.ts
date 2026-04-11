import express, { type Express, type Request } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieSession from "cookie-session";
import router from "./routes";
import { logger } from "./lib/logger";

declare global {
  namespace Express {
    interface Request {
      session: { userId?: number } | null;
    }
  }
}

const app: Express = express();
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173"];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(
  cookieSession({
    name: "session",
    secret: process.env.SESSION_SECRET ?? (() => { throw new Error("SESSION_SECRET env var is required"); })(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  }),
);

app.use("/api", router);

// Global error handler — must be after all routes
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle JSON parse errors (invalid body)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "JSON inválido" });
    return;
  }
  // Handle payload too large
  if (err && typeof err === "object" && "type" in err && (err as any).type === "entity.too.large") {
    res.status(413).json({ error: "Payload demasiado grande" });
    return;
  }
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
