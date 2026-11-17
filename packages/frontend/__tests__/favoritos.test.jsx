import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Favoritos } from "../src/features/favoritos/Favoritos";
import { apiFalsa } from "../pruebas/apiFalsa";
import { eventoDto, renderPantalla } from "../pruebas/pantallas";

function montar() {
  let favoritos = [
    eventoDto({ esFavorito: true }),
    eventoDto({
      id: "e2",
      nombre: "La traviata",
      esFavorito: true,
      yaOcurrio: true,
      finalizado: true,
    }),
  ];
  const llamadas = apiFalsa({
    "GET /favoritos": () => [200, favoritos],
    "DELETE /favoritos/e2": () => {
      favoritos = favoritos.filter((e) => e.id !== "e2");
      return [200, { favoritos: favoritos.map((e) => e.id) }];
    },
    "PUT /favoritos/e2": () => {
      favoritos = [...favoritos, eventoDto({ id: "e2", nombre: "La traviata", esFavorito: true })];
      return [200, { favoritos: favoritos.map((e) => e.id) }];
    },
  });
  return llamadas;
}

describe("Favoritos", () => {
  test("lista los favoritos y marca los anteriores como finalizados", async () => {
    montar();
    await renderPantalla(Favoritos);
    expect(await screen.findByText("Noche de Jazz")).toBeTruthy();
    expect(screen.getAllByText("Finalizado").length).toBeGreaterThan(0);
  });

  test("la acción accesible 'quitar' llama al service y 'Deshacer' lo restaura", async () => {
    const llamadas = montar();
    await renderPantalla(Favoritos);
    const tarjeta = await screen.findByTestId("tarjeta-evento-e2");
    expect(tarjeta.props.accessibilityActions).toEqual([
      { name: "quitar", label: "Quitar de favoritos" },
    ]);
    await fireEvent(tarjeta, "accessibilityAction", { nativeEvent: { actionName: "quitar" } });

    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "DELETE /favoritos/e2")).toBe(true),
    );
    expect(await screen.findByText("Quitaste La traviata de favoritos.")).toBeTruthy();
    expect(screen.queryByTestId("tarjeta-evento-e2")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Deshacer" }));
    await waitFor(() => expect(llamadas.some((l) => l.clave === "PUT /favoritos/e2")).toBe(true));
    expect(await screen.findByTestId("tarjeta-evento-e2")).toBeTruthy();
  });

  test("el corazón también quita el favorito", async () => {
    const llamadas = montar();
    await renderPantalla(Favoritos);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Quitar La traviata de favoritos" }),
    );
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "DELETE /favoritos/e2")).toBe(true),
    );
  });

  test("sin favoritos muestra el estado vacío con CTA", async () => {
    apiFalsa({ "GET /favoritos": () => [200, []] });
    await renderPantalla(Favoritos);
    expect(await screen.findByText("Todavía no guardaste favoritos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Explorar eventos" })).toBeTruthy();
  });
});
