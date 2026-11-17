import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { AuthContext } from "../src/context/AuthContext";
import { NotificacionesProvider } from "../src/context/NotificacionesContext";
import { SocketContext } from "../src/context/SocketContext";
import { usuarioComprador, usuarioOrganizador } from "./apiFalsa";
import { renderConTema } from "./helpers";

const Stack = createNativeStackNavigator();

export const sesionComprador = {
  usuario: { ...usuarioComprador, nombreCompleto: "Ana Gómez" },
  token: "jwt",
  cargando: false,
  iniciarSesion: jest.fn(),
  registrarse: jest.fn(),
  cerrarSesion: jest.fn(),
  esComprador: true,
  esOrganizador: false,
};

export const sesionOrganizador = {
  ...sesionComprador,
  usuario: { ...usuarioOrganizador, nombreCompleto: "Lucía Ferrari" },
  esComprador: false,
  esOrganizador: true,
};

const DESTINOS = [
  "MisEventos",
  "Crear",
  "EditarEvento",
  "ComprasEvento",
  "DetalleEvento",
  "Checkout",
  "DetalleCompra",
  "ChatCompra",
  "TabsComprador",
  "Explorar",
];

function Destino({ route }) {
  return <Text>{`destino:${route.name}:${JSON.stringify(route.params ?? {})}`}</Text>;
}

/**
 * Renderiza una pantalla dentro de un stack real (para useFocusEffect, navigate y replace),
 * con sesión de comprador. `socket` (ver socketFalso) y `conectado` simulan el tiempo real. Los destinos de navegación muestran "destino:<Nombre>:<params>".
 */
export function renderPantalla(
  Componente,
  { params, sesion = sesionComprador, socket = null, conectado = false } = {},
) {
  return renderConTema(
    <AuthContext.Provider value={sesion}>
      <SocketContext.Provider value={{ socket, conectado }}>
        <NotificacionesProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Pantalla" component={Componente} initialParams={params} />
              {DESTINOS.map((nombre) => (
                <Stack.Screen key={nombre} name={nombre} component={Destino} />
              ))}
            </Stack.Navigator>
          </NavigationContainer>
        </NotificacionesProvider>
      </SocketContext.Provider>
    </AuthContext.Provider>,
  );
}

/** DTO de evento del back para los tests. */
export function eventoDto(extra = {}) {
  return {
    id: "e1",
    nombre: "Noche de Jazz",
    descripcion: "Jazz en vivo",
    ampliacionesDescripcion: [],
    categoria: { id: "c1", nombre: "Recitales" },
    fecha: "2030-12-05T23:00:00.000Z",
    lugar: "Club Sur",
    tiposEntrada: [
      {
        id: "t1",
        nombre: "General",
        descripcion: "",
        precio: 18000,
        cupo: 100,
        disponibles: 3,
        vendidas: 97,
        agotado: false,
      },
      {
        id: "t2",
        nombre: "VIP",
        descripcion: "",
        precio: 42000,
        cupo: 10,
        disponibles: 0,
        vendidas: 10,
        agotado: true,
      },
    ],
    multimedia: [],
    imagen: null,
    precioMinimo: 18000,
    agotado: false,
    yaOcurrio: false,
    finalizado: false,
    organizador: { id: "o1", nombre: "Lucía Ferrari", puntajePromedio: 4.5, cantidadResenias: 2 },
    esFavorito: false,
    ...extra,
  };
}

/** DTO de compra (detalle) del back para los tests. */
export function compraDto(extra = {}) {
  return {
    id: "c1",
    evento: {
      id: "e1",
      nombre: "Noche de Jazz",
      fecha: "2030-12-05T23:00:00.000Z",
      lugar: "Club Sur",
      imagen: null,
      yaOcurrio: false,
    },
    tipoEntrada: { id: "t1", nombre: "General" },
    cantidad: 2,
    precioUnitario: 22500,
    total: 45000,
    estado: "PENDIENTE",
    motivoCancelacion: null,
    fechaCompra: "2030-11-20T15:00:00.000Z",
    diasParaElEvento: null,
    fechaLimitePago: "2030-11-22T15:00:00.000Z",
    reembolsoPendiente: false,
    fechaLimiteReembolso: null,
    organizadorId: "o1",
    historial: [
      {
        estadoAnterior: null,
        estadoNuevo: "PENDIENTE",
        quien: { id: "u1", nombre: "Ana Gómez", rol: "COMPRADOR" },
        fechaHora: "2030-11-20T15:00:00.000Z",
        detalle: "Compra de 2 × General por $45.000,00",
      },
    ],
    mensajes: [],
    mensajesNoLeidos: 0,
    resenia: null,
    acciones: {
      puedePagar: true,
      puedeCancelar: true,
      puedeReseniar: false,
      puedeReembolsar: false,
    },
    ...extra,
  };
}

/** Socket falso: registra on/off/emit y `disparar(evento, payload)` llama a los manejadores. */
export function socketFalso({ conectado = true } = {}) {
  const manejadores = new Map();
  return {
    connected: conectado,
    emitidos: [],
    on: jest.fn((evento, fn) => {
      if (!manejadores.has(evento)) manejadores.set(evento, new Set());
      manejadores.get(evento).add(fn);
    }),
    off: jest.fn((evento, fn) => manejadores.get(evento)?.delete(fn)),
    emit: jest.fn(function emit(evento, payload) {
      this.emitidos.push([evento, payload]);
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
    disparar(evento, payload) {
      for (const fn of manejadores.get(evento) ?? []) fn(payload);
    },
    escuchando: (evento) => (manejadores.get(evento)?.size ?? 0) > 0,
  };
}
