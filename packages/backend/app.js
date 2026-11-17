import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import router from "./routes/router.js";
import { origenesPermitidos } from "./utils/cors.js";
import { swaggerSpec } from "./swagger.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { errorLogger } from "./middlewares/errorLogger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: origenesPermitidos() }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", router);
app.use("/uploads", express.static(process.env.UPLOADS_DIR || "uploads"));

app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

export default app;
