import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import router from "./routes/router.js";
import { swaggerSpec } from "./swagger.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorLogger } from "./middlewares/errorLogger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : true,
  }),
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", router);
app.use("/uploads", express.static(process.env.UPLOADS_DIR || "uploads"));

app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

export default app;
