import jwt from "jsonwebtoken";
import {
  app,
  cerrarApi,
  prepararApiConSemilla,
  request,
  sinCamposInternos,
} from "./helpers/apiSemilla.js";

const nuevo = (extra = {}) => ({
  nombre: "Nora",
  apellido: "Paz",
  email: "nora@test.com",
  password: "unaClaveLarga",
  rol: "COMPRADOR",
  ...extra,
});

beforeAll(prepararApiConSemilla);
afterAll(cerrarApi);

describe("POST /api/auth/registro", () => {
  test("registra, normaliza el email y devuelve token + usuario sin hash", async () => {
    const res = await request(app)
      .post("/api/auth/registro")
      .send(nuevo({ email: "  Nora@Test.COM " }));
    expect(res.status).toBe(201);
    expect(res.body.usuario).toEqual({
      id: expect.any(String),
      nombre: "Nora",
      apellido: "Paz",
      email: "nora@test.com",
      rol: "COMPRADOR",
    });
    expect(sinCamposInternos(res.body)).toBe(true);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toMatchObject({
      id: res.body.usuario.id,
      rol: "COMPRADOR",
      nombre: "Nora Paz",
    });
  });

  test("un organizador recibe su puntaje inicial", async () => {
    const res = await request(app)
      .post("/api/auth/registro")
      .send(nuevo({ email: "org@test.com", rol: "ORGANIZADOR" }));
    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({
      rol: "ORGANIZADOR",
      puntajePromedio: 0,
      cantidadResenias: 0,
    });
  });

  test("email duplicado (sin importar mayúsculas) → 409", async () => {
    const res = await request(app)
      .post("/api/auth/registro")
      .send(nuevo({ email: "ANA@ticketit.test" }));
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      status: "fail",
      message: "Ya existe un usuario registrado con ese email",
      timestamp: expect.any(String),
    });
  });

  test.each([
    [{ password: "corta" }, "password"],
    [{ rol: "ADMIN" }, "rol"],
    [{ email: "no-es-email" }, "email"],
    [{ nombre: "  " }, "nombre"],
    [{ esAdmin: true }, ""], // .strict(): campos desconocidos
  ])("datos inválidos %p → 400 con detalle", async (extra, campo) => {
    const res = await request(app).post("/api/auth/registro").send(nuevo(extra));
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
    expect(res.body.detalles.map((d) => d.campo)).toContain(campo);
  });
});

describe("POST /api/auth/login", () => {
  test("credenciales correctas → token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Lucia@ticketit.test", password: "Ticket123!" });
    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ email: "lucia@ticketit.test", rol: "ORGANIZADOR" });
    expect(sinCamposInternos(res.body)).toBe(true);
  });

  test.each([
    { email: "lucia@ticketit.test", password: "incorrecta" },
    { email: "nadie@ticketit.test", password: "Ticket123!" },
  ])("credenciales malas → 401 Credenciales inválidas", async (credenciales) => {
    const res = await request(app).post("/api/auth/login").send(credenciales);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");
  });

  test("body inválido → 400", async () => {
    expect((await request(app).post("/api/auth/login").send({ email: "x" })).status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  test("devuelve el usuario de la sesión", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ana@ticketit.test", password: "Ticket123!" });
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: "ana@ticketit.test", nombre: "Ana", rol: "COMPRADOR" });
    expect(sinCamposInternos(res.body)).toBe(true);
  });

  test("sin token o con token inválido → 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer basura");
    expect(res.status).toBe(401);
  });
});

test("GET /api/categorias es público", async () => {
  const res = await request(app).get("/api/categorias");
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(8);
  expect(res.body[0]).toEqual({
    id: expect.any(String),
    nombre: "Conferencias",
    descripcion: expect.any(String),
  });
});

test("GET /api/resumen-publico: estadísticas y reseñas destacadas para la landing", async () => {
  const res = await request(app).get("/api/resumen-publico");
  expect(res.status).toBe(200);
  expect(res.body.estadisticas).toEqual({
    eventosActivos: 13,
    entradasVendidas: expect.any(Number),
    organizadores: expect.any(Number),
    puntajePromedio: 4.5,
    cantidadResenias: 3,
  });
  expect(res.body.estadisticas.entradasVendidas).toBeGreaterThan(0);
  expect(res.body.reseniasDestacadas.map((r) => r.puntuacion)).toEqual([5, 4.5, 4]);
  expect(res.body.reseniasDestacadas[0].evento.nombre).toBe("Recital Acústico de Otoño");
  expect(sinCamposInternos(res.body)).toBe(true);
});
