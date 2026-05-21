import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "API del Sistema de Ventas para Cafetería funcionando correctamente",
  });
});

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
  });
});