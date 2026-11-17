import { act, fireEvent, screen } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import { direccionDescarte, useToast } from "../src/context/ToastContext";
import { renderConTema } from "../pruebas/helpers";

describe("direccionDescarte (swipe para cerrar avisos)", () => {
  test.each([
    [{ dx: 120, dy: 5 }, "derecha"],
    [{ dx: 30, dy: 2, vx: 0.9 }, "derecha"],
    [{ dx: 4, dy: -60 }, "arriba"],
    [{ dx: 2, dy: -15, vy: -0.8 }, "arriba"],
    [{ dx: 40, dy: 3 }, null], // poco recorrido y lento: vuelve a su lugar
    [{ dx: -150, dy: 0, vx: -2 }, null], // izquierda no descarta
    [{ dx: 0, dy: 120, vy: 2 }, null], // abajo no descarta
  ])("%p → %p", (gesto, esperado) => {
    expect(direccionDescarte(gesto)).toBe(esperado);
  });
});

function Disparador() {
  const toast = useToast();
  return (
    <Pressable onPress={() => toast.success("Agregaste La traviata a favoritos")}>
      <Text>mostrar</Text>
    </Pressable>
  );
}

describe("Toast", () => {
  test("mantiene la X para cerrar y anuncia cómo deslizar", async () => {
    await renderConTema(<Disparador />);
    await fireEvent.press(screen.getByText("mostrar"));
    expect(screen.getByText("Agregaste La traviata a favoritos")).toBeTruthy();
    expect(screen.getByTestId("toast-swipe-success").props.accessibilityHint).toMatch(
      /derecha o hacia arriba/,
    );
    await act(async () => fireEvent.press(screen.getByLabelText("Cerrar aviso")));
    expect(screen.queryByText("Agregaste La traviata a favoritos")).toBeNull();
  });
});
