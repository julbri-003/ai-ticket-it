import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { TarjetaCompra } from "../src/components/compras/TarjetaCompra";
import { TimelineEstados } from "../src/components/compras/TimelineEstados";
import { Checkout } from "../src/features/compras/Checkout";
import { DetalleCompra } from "../src/features/compras/DetalleCompra";
import { DetalleEvento } from "../src/features/eventos/DetalleEvento";
import { aCompra, aCompraDetalle } from "../src/service/comprasService";
import { apiFalsa } from "../pruebas/apiFalsa";
import { compraDto, eventoDto, renderPantalla } from "../pruebas/pantallas";
import { renderConTema } from "../pruebas/helpers";

describe("TarjetaCompra", () => {
  test.each([
    ["CONFIRMADA", { diasParaElEvento: 5, fechaLimitePago: null }, true],
    ["PENDIENTE", { diasParaElEvento: null }, false],
    ["UTILIZADA", { diasParaElEvento: null, fechaLimitePago: null }, false],
  ])("%s: 'Faltan N días' solo si está CONFIRMADA", async (estado, extra, muestra) => {
    await renderConTema(
      <TarjetaCompra compra={aCompra(compraDto({ estado, ...extra }))} onPress={jest.fn()} />,
    );
    if (muestra) expect(screen.getByText("Faltan 5 días")).toBeTruthy();
    else expect(screen.queryByTestId("aviso-dias")).toBeNull();
  });

  test("PENDIENTE muestra 'Pagá antes del…' y el botón Pagar; reembolso en proceso", async () => {
    const onPagar = jest.fn();
    await renderConTema(<TarjetaCompra compra={aCompra(compraDto())} onPagar={onPagar} />);
    expect(screen.getByText(/Pagá antes del/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /Pagar/ }));
    expect(onPagar).toHaveBeenCalled();
    await renderConTema(
      <TarjetaCompra
        compra={aCompra(
          compraDto({
            estado: "CANCELADA",
            reembolsoPendiente: true,
            fechaLimiteReembolso: "2030-11-21T15:00:00.000Z",
            fechaLimitePago: null,
            acciones: { puedePagar: false },
          }),
        )}
      />,
    );
    expect(screen.getByText(/Reembolso en proceso \(hasta el/)).toBeTruthy();
  });
});

describe("TimelineEstados", () => {
  test("cada cambio con estado, quién (Vos / Sistema) y detalle", async () => {
    const compra = aCompraDetalle(
      compraDto({
        historial: [
          ...compraDto().historial,
          {
            estadoAnterior: "PENDIENTE",
            estadoNuevo: "CANCELADA",
            quien: { id: "SISTEMA", nombre: "Sistema", rol: "SISTEMA" },
            fechaHora: "2030-11-22T15:00:00.000Z",
            detalle: "Vencida: 48 h sin pago",
          },
        ],
      }),
      "u1",
    );
    await renderConTema(<TimelineEstados historial={compra.historial} />);
    const pasos = screen.getAllByTestId("paso-timeline");
    expect(pasos).toHaveLength(2);
    expect(pasos[0].props.accessibilityLabel).toMatch(
      /Pendiente de pago, .* por Vos\. Compra de 2 × General/,
    );
    expect(pasos[1].props.accessibilityLabel).toMatch(
      /Cancelada, .* por Sistema\. Vencida: 48 h sin pago/,
    );
  });
});

describe("Checkout", () => {
  test("el modal muestra el importe correcto y confirmar llama a /pagar", async () => {
    const llamadas = apiFalsa({
      "GET /compras/c1": () => [200, compraDto()],
      "POST /compras/c1/pagar": () => [200, compraDto({ estado: "CONFIRMADA" })],
    });
    await renderPantalla(Checkout, { params: { compraId: "c1" } });
    expect(await screen.findByText(/Tenés hasta el/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("boton-pagar"));
    expect(screen.getByText(/¿Seguro que querés pagar \$\s?45\.000,00\?/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Pagar" }));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /compras/c1/pagar")).toBe(true),
    );
    expect(await screen.findByText(/destino:DetalleCompra/)).toBeTruthy();
    expect(screen.getByText("Pago confirmado")).toBeTruthy();
  });

  test("si falla el pago muestra el error del back", async () => {
    apiFalsa({
      "GET /compras/c1": () => [200, compraDto()],
      "POST /compras/c1/pagar": () => [409, { message: "La compra venció" }],
    });
    await renderPantalla(Checkout, { params: { compraId: "c1" } });
    await fireEvent.press(await screen.findByTestId("boton-pagar"));
    await fireEvent.press(screen.getByRole("button", { name: "Pagar" }));
    expect(await screen.findByText("La compra venció")).toBeTruthy();
  });
});

describe("DetalleCompra", () => {
  test.each([
    [
      { puedePagar: true, puedeCancelar: true, puedeReseniar: false },
      ["accion-pagar", "accion-cancelar"],
      ["accion-calificar"],
    ],
    [
      { puedePagar: false, puedeCancelar: false, puedeReseniar: true },
      ["accion-calificar"],
      ["accion-pagar", "accion-cancelar"],
    ],
    [
      { puedePagar: false, puedeCancelar: false, puedeReseniar: false },
      [],
      ["accion-pagar", "accion-cancelar", "accion-calificar"],
    ],
  ])("acciones según los flags %p", async (acciones, visibles, ocultas) => {
    apiFalsa({
      "GET /compras/c1": () => [
        200,
        compraDto({ acciones: { ...acciones, puedeReembolsar: false } }),
      ],
    });
    await renderPantalla(DetalleCompra, { params: { compraId: "c1" } });
    expect(await screen.findByTestId("accion-chat")).toBeTruthy();
    for (const id of visibles) expect(screen.getByTestId(id)).toBeTruthy();
    for (const id of ocultas) expect(screen.queryByTestId(id)).toBeNull();
  });

  test("cancelar una CONFIRMADA avisa el reembolso y llama a /cancelar", async () => {
    const llamadas = apiFalsa({
      "GET /compras/c1": () => [
        200,
        compraDto({
          estado: "CONFIRMADA",
          diasParaElEvento: 3,
          fechaLimitePago: null,
          acciones: { puedePagar: false, puedeCancelar: true, puedeReseniar: false },
        }),
      ],
      "POST /compras/c1/cancelar": () => [
        200,
        compraDto({
          estado: "CANCELADA",
          reembolsoPendiente: true,
          fechaLimiteReembolso: "2030-11-21T15:00:00.000Z",
          fechaLimitePago: null,
          acciones: { puedePagar: false, puedeCancelar: false, puedeReseniar: false },
        }),
      ],
    });
    await renderPantalla(DetalleCompra, { params: { compraId: "c1" } });
    expect(await screen.findByTestId("detalle-dias")).toHaveTextContent("Faltan 3 días");
    await fireEvent.press(screen.getByTestId("accion-cancelar"));
    expect(screen.getByText(/Se te reembolsarán \$\s?45\.000,00 dentro de 24 h\./)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar" }));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /compras/c1/cancelar")).toBe(true),
    );
    expect(await screen.findByText("Compra cancelada")).toBeTruthy();
  });
});

describe("DetalleEvento", () => {
  const montar = () =>
    apiFalsa({
      "GET /eventos/e1": () => [200, eventoDto()],
      "GET /eventos/e1/resenias": () => [200, { items: [], total: 0, pagina: 1, limite: 5 }],
      "POST /compras": () => [200, compraDto()],
    });

  test("la cantidad no supera los disponibles y un tipo agotado no se puede elegir", async () => {
    montar();
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    await fireEvent.press(await screen.findByTestId("tipo-t1"));
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByTestId("cantidad-sumar"));
    expect(screen.getByTestId("cantidad-valor")).toHaveTextContent("3");
    expect(screen.getByTestId("cantidad-sumar").props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId("tipo-t2").props.accessibilityState.disabled).toBe(true);
  });

  test("volver en el modal de reserva no crea la compra", async () => {
    const llamadas = montar();
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    await fireEvent.press(await screen.findByTestId("tipo-t1"));
    await fireEvent.press(screen.getByTestId("boton-comprar"));
    await fireEvent.press(await screen.findByText("Volver"));
    expect(llamadas.some((l) => l.clave === "POST /compras")).toBe(false);
  });

  test("comprar crea la compra con el tipo y la cantidad elegidos y va al checkout", async () => {
    const llamadas = montar();
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    await fireEvent.press(await screen.findByTestId("tipo-t1"));
    await fireEvent.press(screen.getByTestId("cantidad-sumar"));
    expect(screen.getByTestId("total-compra")).toHaveTextContent(/36\.000,00/);
    await fireEvent.press(screen.getByTestId("boton-comprar"));
    // Primero pide confirmar la reserva, sin crear nada todavía.
    expect(await screen.findByText("Confirmar reserva")).toBeTruthy();
    expect(screen.getByText(/Vas a reservar 2 entradas/)).toBeTruthy();
    expect(screen.getByText(/Total: \$\s?36\.000,00/)).toBeTruthy();
    expect(llamadas.some((l) => l.clave === "POST /compras")).toBe(false);
    await fireEvent.press(screen.getByText("Reservar"));
    await waitFor(() => expect(llamadas.some((l) => l.clave === "POST /compras")).toBe(true));
    const post = llamadas.find((l) => l.clave === "POST /compras");
    expect(JSON.parse(post.config.data)).toEqual({
      eventoId: "e1",
      tipoEntradaId: "t1",
      cantidad: 2,
    });
    expect(await screen.findByText(/destino:Checkout:\{"compraId":"c1"\}/)).toBeTruthy();
  });
});
