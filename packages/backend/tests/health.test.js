import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { levantarDB, bajarDB } from "./helpers/dbMemoria.js";

describe("Humo de la API", () => {
  beforeAll(levantarDB);
  afterAll(bajarDB);

  test("la base en memoria queda conectada", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test("GET /api/health responde 200 con { status: 'ok' }", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("una ruta inexistente responde 404 con { status, message, timestamp }", async () => {
    const res = await request(app).get("/api/no-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: "fail",
      message: "Ruta /api/no-existe no encontrada",
      timestamp: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  test("GET /api-docs sirve Swagger UI", async () => {
    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });
});
