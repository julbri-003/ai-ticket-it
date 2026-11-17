import { fireEvent, screen } from "@testing-library/react-native";
import {
  Button,
  EstadoCompraBadge,
  Input,
  ModalConfirmacion,
  paginasVisibles,
} from "../src/components/ui";
import { renderConTema } from "../pruebas/helpers";

describe("Button", () => {
  test("loading deshabilita y marca busy", async () => {
    const onPress = jest.fn();
    await renderConTema(
      <Button onPress={onPress} loading testID="boton">
        Pagar
      </Button>,
    );
    const boton = screen.getByTestId("boton");
    expect(boton.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(boton);
    expect(onPress).not.toHaveBeenCalled();
  });

  test("habilitado: rol button, label del texto y onPress", async () => {
    const onPress = jest.fn();
    await renderConTema(<Button onPress={onPress}>Comprar</Button>);
    const boton = screen.getByRole("button", { name: "Comprar" });
    expect(boton.props.accessibilityState).toMatchObject({ disabled: false, busy: false });
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("en modo oscuro también renderiza", async () => {
    await renderConTema(<Button variant="danger">Cancelar compra</Button>, {
      preferencia: "oscuro",
    });
    expect(screen.getByRole("button", { name: "Cancelar compra" })).toBeTruthy();
  });
});

describe("ModalConfirmacion", () => {
  const props = {
    visible: true,
    titulo: "¿Cancelar la compra?",
    mensaje: "Se libera el cupo y queda el reembolso pendiente.",
    textoConfirmar: "Sí, cancelar",
  };

  test("muestra título y texto; confirmar y cancelar llaman a su callback", async () => {
    const alConfirmar = jest.fn();
    const alCancelar = jest.fn();
    await renderConTema(
      <ModalConfirmacion {...props} alConfirmar={alConfirmar} alCancelar={alCancelar} />,
    );
    expect(screen.getByText(props.titulo)).toBeTruthy();
    expect(screen.getByText(props.mensaje)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Sí, cancelar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(alConfirmar).toHaveBeenCalledTimes(1);
    expect(alCancelar).toHaveBeenCalledTimes(1);
  });

  test("con cargando, confirmar queda busy y no se puede cerrar", async () => {
    const alConfirmar = jest.fn();
    await renderConTema(
      <ModalConfirmacion {...props} cargando alConfirmar={alConfirmar} alCancelar={jest.fn()} />,
    );
    const confirmar = screen.getByRole("button", { name: "Sí, cancelar" });
    expect(confirmar.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  test("no se muestra si no está visible", async () => {
    await renderConTema(
      <ModalConfirmacion
        {...props}
        visible={false}
        alConfirmar={jest.fn()}
        alCancelar={jest.fn()}
      />,
    );
    expect(screen.queryByText(props.titulo)).toBeNull();
  });
});

describe("EstadoCompraBadge", () => {
  test.each([
    ["PENDIENTE", "Pendiente de pago"],
    ["CONFIRMADA", "Confirmada"],
    ["UTILIZADA", "Utilizada"],
    ["CANCELADA", "Cancelada"],
    ["REEMBOLSADA", "Reembolsada"],
  ])("%s muestra el texto %s (no solo color)", async (estado, texto) => {
    await renderConTema(<EstadoCompraBadge estado={estado} />);
    expect(screen.getByText(texto)).toBeTruthy();
    expect(screen.getByLabelText(`Estado: ${texto}`)).toBeTruthy();
  });
});

describe("Input", () => {
  test("label visible, * si es obligatorio y error anunciado debajo", async () => {
    await renderConTema(
      <Input
        label="Correo electrónico"
        requerido
        error="Revisá el email"
        value=""
        onChangeText={jest.fn()}
        testID="input"
      />,
    );
    expect(screen.getByText(/Correo electrónico/)).toBeTruthy();
    expect(screen.getByText(" *")).toBeTruthy();
    expect(screen.getByText("Revisá el email")).toBeTruthy();
    expect(screen.getByRole("alert").props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByTestId("input").props.accessibilityLabel).toBe("Correo electrónico");
  });

  test("ayuda visible sin error; secure permite mostrar la contraseña", async () => {
    await renderConTema(
      <Input
        label="Contraseña"
        ayuda="Mínimo 8 caracteres."
        secure
        value="x"
        onChangeText={jest.fn()}
        testID="pass"
      />,
    );
    expect(screen.getByText("Mínimo 8 caracteres.")).toBeTruthy();
    expect(screen.getByTestId("pass").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByTestId("pass").props.secureTextEntry).toBe(false);
  });
});

test("Paginacion: páginas visibles con elipsis", () => {
  expect(paginasVisibles(1, 1)).toEqual([1]);
  expect(paginasVisibles(5, 9)).toEqual([1, "…", 4, 5, 6, "…", 9]);
  expect(paginasVisibles(1, 4)).toEqual([1, 2, "…", 4]);
});
