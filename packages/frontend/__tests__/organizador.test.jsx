import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { TarjetaCompra } from "../src/components/compras/TarjetaCompra";
import { DetalleCompra } from "../src/features/compras/DetalleCompra";
import { DetalleEvento } from "../src/features/eventos/DetalleEvento";
import { aCompra } from "../src/service/comprasService";
import { quedanTexto } from "../src/service/eventosService";
import { renderConTema } from "../pruebas/helpers";
import { ComprasEvento } from "../src/features/organizador/ComprasEvento";
import { CrearEvento } from "../src/features/organizador/CrearEvento";
import { EditarEvento } from "../src/features/organizador/EditarEvento";
import { MisEventos } from "../src/features/organizador/MisEventos";
import { validarAlt, validarArchivo, validarTiposEntrada } from "../src/service/organizadorService";
import { apiFalsa, usuarioOrganizador } from "../pruebas/apiFalsa";
import { compraDto, eventoDto, renderPantalla, sesionOrganizador } from "../pruebas/pantallas";

const comoOrganizador = (Componente, params) =>
  renderPantalla(Componente, { params, sesion: sesionOrganizador });

const enUnaHora = () => new Date(Date.now() + 3600 * 1000).toISOString();

describe("validaciones del formulario", () => {
  test("al menos un tipo de entrada y nombres únicos (sin distinguir mayúsculas)", () => {
    expect(validarTiposEntrada([]).general).toBe("Agregá al menos un tipo de entrada.");
    const r = validarTiposEntrada([
      { nombre: "General", precio: "100", cupo: "10" },
      { nombre: " general ", precio: "0", cupo: "1.5" },
    ]);
    expect(r.hayErrores).toBe(true);
    expect(r.porTipo[0]).toEqual({});
    expect(r.porTipo[1].nombre).toMatch(/Ya hay un tipo de entrada llamado/);
    expect(r.porTipo[1].precio).toMatch(/mayor a 0/);
    expect(r.porTipo[1].cupo).toMatch(/entero/);
  });

  test("tipo y tamaño de archivo; texto alternativo obligatorio también en videos", () => {
    const imagen = { tipo: "imagen", mimeType: "image/png", tamanio: 1024, alt: "" };
    expect(validarArchivo(imagen)).toBeNull();
    expect(validarArchivo({ ...imagen, mimeType: "image/gif" })).toMatch(/Formato no permitido/);
    expect(validarArchivo({ ...imagen, tamanio: 6 * 1024 * 1024 })).toMatch(/supera el máximo/);
    expect(
      validarArchivo({ tipo: "video", mimeType: "video/mp4", tamanio: 21 * 1024 * 1024 }),
    ).toMatch(/supera el máximo/);
    expect(validarAlt(imagen)).toMatch(/imagen/);
    expect(validarAlt({ tipo: "video", alt: "  " })).toMatch(/video/);
    expect(validarAlt({ tipo: "video", alt: "Banda tocando" })).toBeNull();
  });
});

describe("CrearEvento", () => {
  const montar = () =>
    apiFalsa({
      "GET /categorias": () => [200, [{ id: "c1", nombre: "Recitales" }]],
      "POST /eventos": (config) => [
        201,
        eventoDto({
          ...JSON.parse(config.data),
          id: "e9",
          categoria: { id: "c1", nombre: "Recitales" },
        }),
      ],
    });

  async function completarDatos() {
    await fireEvent.changeText(screen.getByTestId("evento-nombre"), "Noche de Jazz");
    await fireEvent.press(await screen.findByRole("button", { name: /Categoría/ }));
    await fireEvent.press(await screen.findByText("Recitales"));
    await fireEvent.press(screen.getByTestId("campo-fecha"));
    await fireEvent(
      screen.getByTestId("selector-fecha-hora"),
      "change",
      { type: "set" },
      new Date(2031, 0, 10),
    );
    await fireEvent.changeText(screen.getByTestId("evento-lugar"), "Club Sur");
    await fireEvent.changeText(screen.getByTestId("evento-descripcion"), "Jazz en vivo");
  }

  test("valida los datos antes de avanzar", async () => {
    montar();
    await comoOrganizador(CrearEvento);
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByText("Poné el nombre del evento.")).toBeTruthy();
    expect(screen.getByText("Elegí la fecha y la hora.")).toBeTruthy();
    expect(screen.getByTestId("evento-nombre")).toBeTruthy();
  });

  test("no avanza sin tipos de entrada y valida nombres duplicados", async () => {
    montar();
    await comoOrganizador(CrearEvento);
    await completarDatos();
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByTestId("agregar-tipo")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("quitar-tipo-0"));
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByText("Agregá al menos un tipo de entrada.")).toBeTruthy();
    expect(screen.queryByTestId("elegir-multimedia")).toBeNull();

    await fireEvent.press(screen.getByTestId("agregar-tipo"));
    await fireEvent.press(screen.getByTestId("agregar-tipo"));
    for (const i of [0, 1]) {
      await fireEvent.changeText(screen.getByTestId(`tipo-${i}-nombre`), i ? "general" : "General");
      await fireEvent.changeText(screen.getByTestId(`tipo-${i}-precio`), "18000");
      await fireEvent.changeText(screen.getByTestId(`tipo-${i}-cupo`), "100");
    }
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByText('Ya hay un tipo de entrada llamado "general".')).toBeTruthy();
    expect(screen.queryByTestId("elegir-multimedia")).toBeNull();

    await fireEvent.press(screen.getByTestId("quitar-tipo-1"));
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByTestId("elegir-multimedia")).toBeTruthy();
  });

  test("publicar crea el evento con fecha ISO y números, avisa y vuelve a Mis eventos", async () => {
    const llamadas = montar();
    await comoOrganizador(CrearEvento);
    await completarDatos();
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    await fireEvent.changeText(screen.getByTestId("tipo-0-nombre"), "General");
    await fireEvent.changeText(screen.getByTestId("tipo-0-precio"), "18000,50");
    await fireEvent.changeText(screen.getByTestId("tipo-0-cupo"), "100");
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    await fireEvent.press(screen.getByTestId("publicar"));
    expect(screen.getByText(/no vas a poder editar la descripción original/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole("button", { name: "Publicar" }).at(-1));
    expect(await screen.findByText(/destino:MisEventos/)).toBeTruthy();
    const enviado = JSON.parse(llamadas.find((l) => l.clave === "POST /eventos").config.data);
    expect(enviado.fecha).toBe(new Date(2031, 0, 10, 21, 0).toISOString());
    expect(enviado.tiposEntrada).toEqual([{ nombre: "General", precio: 18000.5, cupo: 100 }]);
    expect(screen.getByText("Evento publicado")).toBeTruthy();
  });
});

describe("EditarEvento", () => {
  const conAmpliacion = (extra = {}) =>
    eventoDto({
      ampliacionesDescripcion: [
        { texto: "Se suma un invitado", fecha: "2030-11-01T12:00:00.000Z" },
      ],
      ...extra,
    });

  test("tipos existentes en solo lectura y descripción original no editable", async () => {
    const llamadas = apiFalsa({
      "GET /eventos/e1": () => [200, conAmpliacion()],
      "POST /eventos/e1/ampliaciones": () => [200, conAmpliacion()],
    });
    await comoOrganizador(EditarEvento, { eventoId: "e1" });
    const tipo = await screen.findByTestId("tipo-existente-t1");
    expect(within(tipo).getByText("General")).toBeTruthy();
    expect(within(tipo).queryByRole("button")).toBeNull();
    expect(screen.queryByLabelText(/Quitar tipo/)).toBeNull();
    expect(screen.getByTestId("agregar-tipo-entrada")).toBeTruthy();

    const original = screen.getByTestId("descripcion-original");
    expect(original.type).toBe("Text");
    expect(original).toHaveTextContent("Jazz en vivo");
    expect(screen.getByText("Se suma un invitado")).toBeTruthy();
    expect(screen.getByLabelText("Nombre: Noche de Jazz. No editable")).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId("campo-actualizacion"), "Abre a las 20 h");
    await fireEvent.press(screen.getByTestId("publicar-actualizacion"));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /eventos/e1/ampliaciones")).toBe(true),
    );
  });

  test("agregar un tipo nuevo valida que no repita un nombre existente", async () => {
    const llamadas = apiFalsa({ "GET /eventos/e1": () => [200, conAmpliacion()] });
    await comoOrganizador(EditarEvento, { eventoId: "e1" });
    await fireEvent.press(await screen.findByTestId("agregar-tipo-entrada"));
    await fireEvent.changeText(screen.getByTestId("nuevo-tipo-nombre"), "vip");
    await fireEvent.changeText(screen.getByTestId("nuevo-tipo-precio"), "50000");
    await fireEvent.changeText(screen.getByTestId("nuevo-tipo-cupo"), "5");
    await fireEvent.press(screen.getByTestId("guardar-tipo"));
    expect(screen.getByText('Ya hay un tipo de entrada llamado "vip".')).toBeTruthy();
    expect(llamadas.some((l) => l.clave.startsWith("POST"))).toBe(false);
  });

  test("si el evento ya ocurrió, todo queda en solo lectura", async () => {
    apiFalsa({ "GET /eventos/e1": () => [200, conAmpliacion({ yaOcurrio: true })] });
    await comoOrganizador(EditarEvento, { eventoId: "e1" });
    expect(await screen.findByTestId("aviso-solo-lectura")).toBeTruthy();
    expect(screen.queryByTestId("agregar-tipo-entrada")).toBeNull();
    expect(screen.queryByTestId("campo-actualizacion")).toBeNull();
    expect(screen.queryByTestId("elegir-multimedia")).toBeNull();
  });
});

describe("ComprasEvento", () => {
  const compraLista = (extra) => ({
    comprador: { id: "u1", nombre: "Ana", apellido: "Gómez" },
    tipoEntrada: { id: "t1", nombre: "General" },
    cantidad: 2,
    total: 36000,
    motivoCancelacion: null,
    fechaCompra: "2030-11-20T15:00:00.000Z",
    reembolsoPendiente: false,
    fechaLimiteReembolso: null,
    acciones: { puedeReembolsar: false },
    ...extra,
  });
  const respuesta = {
    evento: { id: "e1", nombre: "Noche de Jazz" },
    resumen: {
      tiposEntrada: [
        { id: "t1", nombre: "General", cupo: 100, vendidas: 97, disponibles: 3 },
        { id: "t2", nombre: "VIP", cupo: 10, vendidas: 10, disponibles: 0 },
      ],
      porEstado: { PENDIENTE: 0, CONFIRMADA: 1, UTILIZADA: 0, CANCELADA: 1, REEMBOLSADA: 0 },
      recaudacionConfirmada: 36000,
      reembolsosPendientes: [{ compraId: "c2", total: 36000, fechaLimiteReembolso: enUnaHora() }],
    },
    compras: [
      compraLista({ id: "c1", estado: "CONFIRMADA" }),
      compraLista({
        id: "c2",
        estado: "CANCELADA",
        comprador: { id: "u3", nombre: "Bruno", apellido: "Díaz" },
        reembolsoPendiente: true,
        fechaLimiteReembolso: enUnaHora(),
        acciones: { puedeReembolsar: true },
      }),
    ],
  };

  test("resumen por tipo con 'Quedan N' y Reembolsar solo con reembolso pendiente", async () => {
    const llamadas = apiFalsa({
      "GET /eventos/e1/compras": () => [200, respuesta],
      "GET /eventos/e1": () => [200, eventoDto()],
      "POST /compras/c2/reembolsar": () => [200, compraDto({ id: "c2", estado: "REEMBOLSADA" })],
    });
    await comoOrganizador(ComprasEvento, { eventoId: "e1", nombre: "Noche de Jazz" });
    expect(await screen.findByText("Quedan 3")).toBeTruthy();
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect(screen.getByTestId("recaudacion")).toHaveTextContent(/36\.000,00/);
    expect(screen.queryByTestId("reembolsar-c1")).toBeNull();
    expect(screen.getByTestId("reembolsar-c2")).toBeTruthy();
    expect(screen.getByText(/Reembolso automático el/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId("reembolsar-c2"));
    expect(screen.getByText(/devolviste \$\s?36\.000,00 a Bruno Díaz/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole("button", { name: "Reembolsar" }).at(-1));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /compras/c2/reembolsar")).toBe(true),
    );
  });

  test("tocar una compra abre su detalle", async () => {
    apiFalsa({
      "GET /eventos/e1/compras": () => [200, respuesta],
      "GET /eventos/e1": () => [200, eventoDto()],
    });
    await comoOrganizador(ComprasEvento, { eventoId: "e1" });
    await fireEvent.press(await screen.findByTestId("abrir-compra-c1"));
    expect(await screen.findByText(/destino:DetalleCompra:\{"compraId":"c1"\}/)).toBeTruthy();
  });
});

describe("MisEventos", () => {
  test("alerta de reembolsos pendientes solo en el evento que los tiene", async () => {
    apiFalsa({
      "GET /auth/me": () => [200, usuarioOrganizador],
      "GET /eventos/mios": () => [
        200,
        [
          eventoDto({
            comprasPorEstado: { CONFIRMADA: 3, CANCELADA: 2 },
            reembolsosPendientes: { cantidad: 2, proximoVencimiento: enUnaHora() },
          }),
          eventoDto({
            id: "e2",
            nombre: "Teatro",
            comprasPorEstado: {},
            reembolsosPendientes: { cantidad: 0, proximoVencimiento: null },
          }),
        ],
      ],
    });
    await comoOrganizador(MisEventos);
    const alertas = await screen.findAllByTestId("alerta-reembolsos");
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toHaveTextContent(/2 reembolsos por hacer · vence en/);
    expect(
      within(screen.getByTestId("evento-org-e2")).queryByTestId("alerta-reembolsos"),
    ).toBeNull();
  });
});

describe("DetalleCompra (organizador)", () => {
  test("muestra Reembolsar y el chat con el comprador; oculta las acciones del comprador", async () => {
    const llamadas = apiFalsa({
      "GET /compras/c1": () => [
        200,
        compraDto({
          organizadorId: "u2",
          estado: "CANCELADA",
          reembolsoPendiente: true,
          fechaLimiteReembolso: enUnaHora(),
          fechaLimitePago: null,
          acciones: {
            puedePagar: false,
            puedeCancelar: false,
            puedeReseniar: false,
            puedeReembolsar: true,
          },
        }),
      ],
      "POST /compras/c1/reembolsar": () => [
        200,
        compraDto({ organizadorId: "u2", estado: "REEMBOLSADA" }),
      ],
    });
    await comoOrganizador(DetalleCompra, { compraId: "c1" });
    expect(await screen.findByText("Chat con el comprador")).toBeTruthy();
    expect(screen.queryByTestId("accion-pagar")).toBeNull();
    expect(screen.queryByTestId("accion-cancelar")).toBeNull();
    await fireEvent.press(screen.getByTestId("accion-reembolsar"));
    await fireEvent.press(screen.getByRole("button", { name: "Reembolsar" }));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /compras/c1/reembolsar")).toBe(true),
    );
    expect(await screen.findByText("Reembolso registrado")).toBeTruthy();
  });
});

describe("Cupo restante por tipo de entrada", () => {
  test("Agotado, ¡Es la última! o Quedan N (siempre con el número)", () => {
    expect(quedanTexto(0)).toBe("Agotado");
    expect(quedanTexto(1)).toBe("¡Es la última!");
    expect(quedanTexto(5)).toBe("Quedan 5");
    expect(quedanTexto(250)).toBe("Quedan 250");
  });

  test("el detalle del evento muestra lo que queda de cada tipo", async () => {
    apiFalsa({
      "GET /eventos/e1": () => [
        200,
        eventoDto({
          tiposEntrada: [
            { ...eventoDto().tiposEntrada[0], disponibles: 1, vendidas: 99 },
            { ...eventoDto().tiposEntrada[1], disponibles: 0, vendidas: 10 },
            {
              id: "t3",
              nombre: "Platea",
              descripcion: "",
              precio: 9000,
              cupo: 300,
              disponibles: 120,
              vendidas: 180,
              agotado: false,
            },
          ],
        }),
      ],
      "GET /eventos/e1/resenias": () => [200, { items: [], total: 0, pagina: 1, limite: 5 }],
    });
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    expect(await screen.findByText("¡Es la última!")).toBeTruthy();
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect(screen.getByText("Quedan 120")).toBeTruthy();
  });
});

describe("Cancelar un evento", () => {
  const cancelado = (extra = {}) =>
    eventoDto({
      cancelado: true,
      cancelacion: { motivo: "La sala cerró por obras", fecha: "2030-11-01T12:00:00.000Z" },
      ...extra,
    });

  test("Mis eventos: el cancelado va en 'Cancelados' con la pill y el motivo", async () => {
    apiFalsa({
      "GET /auth/me": () => [200, usuarioOrganizador],
      "GET /eventos/mios": () => [
        200,
        [
          eventoDto({ comprasPorEstado: {}, reembolsosPendientes: { cantidad: 0 } }),
          cancelado({ id: "e3", nombre: "Obra suspendida", comprasPorEstado: { REEMBOLSADA: 2 } }),
        ],
      ],
    });
    await comoOrganizador(MisEventos);
    expect(await screen.findByTestId("evento-org-e1")).toBeTruthy();
    expect(screen.queryByTestId("evento-org-e3")).toBeNull();
    await fireEvent.press(screen.getByText("Cancelados"));
    const tarjeta = await screen.findByTestId("evento-org-e3");
    expect(within(tarjeta).getByText("Cancelado")).toBeTruthy();
    expect(within(tarjeta).getByText("Motivo: La sala cerró por obras")).toBeTruthy();
    expect(within(tarjeta).queryByLabelText(/Editar/)).toBeNull();
    expect(screen.queryByTestId("evento-org-e1")).toBeNull();
  });

  test("Editar: el motivo es obligatorio y confirmar llama a /cancelar", async () => {
    const llamadas = apiFalsa({
      "GET /eventos/e1": () => [200, eventoDto()],
      "POST /eventos/e1/cancelar": () => [200, { ...cancelado(), comprasResueltas: 3 }],
    });
    await comoOrganizador(EditarEvento, { eventoId: "e1" });
    await fireEvent.press(await screen.findByTestId("cancelar-evento"));
    expect(screen.getByText(/las pagas se reembolsan automáticamente/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("confirmar-cancelar-evento"));
    expect(screen.getByText("Contá el motivo: lo van a ver los compradores.")).toBeTruthy();
    expect(llamadas.some((l) => l.clave === "POST /eventos/e1/cancelar")).toBe(false);

    await fireEvent.changeText(screen.getByTestId("motivo-cancelacion-input"), " Lluvia ");
    await fireEvent.press(screen.getByTestId("confirmar-cancelar-evento"));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /eventos/e1/cancelar")).toBe(true),
    );
    const envio = llamadas.find((l) => l.clave === "POST /eventos/e1/cancelar");
    expect(JSON.parse(envio.config.data)).toEqual({ motivo: "Lluvia" });
    expect(await screen.findByText(/Se cancelaron y reembolsaron 3 compras/)).toBeTruthy();
  });

  test("Editar: un evento cancelado queda en solo lectura, con el motivo", async () => {
    apiFalsa({ "GET /eventos/e1": () => [200, cancelado()] });
    await comoOrganizador(EditarEvento, { eventoId: "e1" });
    expect(await screen.findByTestId("aviso-solo-lectura")).toHaveTextContent(
      /Evento cancelado\. Motivo: La sala cerró por obras/,
    );
    expect(screen.queryByTestId("cancelar-evento")).toBeNull();
    expect(screen.queryByTestId("agregar-tipo-entrada")).toBeNull();
  });

  test("el comprador ve la pill, el motivo y no puede comprar", async () => {
    apiFalsa({
      "GET /eventos/e1": () => [200, cancelado()],
      "GET /eventos/e1/resenias": () => [200, { items: [], total: 0, pagina: 1, limite: 5 }],
    });
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    expect(await screen.findByText("Este evento fue cancelado")).toBeTruthy();
    expect(screen.getByText("Cancelado")).toBeTruthy();
    expect(screen.getByText(/Motivo: La sala cerró por obras/)).toBeTruthy();
    expect(screen.queryByTestId("boton-comprar")).toBeNull();
  });

  test("Mis compras: aviso de evento cancelado y reembolso automático", async () => {
    await renderConTema(
      <TarjetaCompra
        compra={aCompra(
          compraDto({
            estado: "REEMBOLSADA",
            motivoCancelacion: "EVENTO_CANCELADO",
            fechaLimitePago: null,
            acciones: { puedePagar: false },
          }),
        )}
      />,
    );
    expect(screen.getByTestId("aviso-evento-cancelado")).toHaveTextContent(
      "Evento cancelado: te reembolsamos automáticamente",
    );
  });
});
