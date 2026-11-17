import { Evento } from "../../domain/eventoDominio.js";
import { Compra } from "../../domain/compraDominio.js";
import { Roles } from "../../domain/rolesDominio.js";

export const AHORA = new Date("2026-12-01T12:00:00.000Z");
export const HORA = 60 * 60 * 1000;
export const DIA = 24 * HORA;

/** Reloj fijo que se puede adelantar en los tests. */
export function relojFijo(fecha = AHORA) {
  let actual = new Date(fecha);
  return {
    ahora: () => new Date(actual),
    avanzar: (ms) => {
      actual = new Date(actual.getTime() + ms);
    },
    fijar: (nueva) => {
      actual = new Date(nueva);
    },
  };
}

export const comprador = { id: "comprador-1", nombre: "Ana Pérez", rol: Roles.COMPRADOR };
export const otroComprador = { id: "comprador-2", nombre: "Beto Gómez", rol: Roles.COMPRADOR };
export const organizador = { id: "organizador-1", nombre: "Teatro Sur", rol: Roles.ORGANIZADOR };
export const sistemaUsuario = { id: "SISTEMA", nombre: "Sistema" };

export function datosEvento(sobrescribir = {}) {
  return {
    id: "evento-1",
    nombre: "Concierto de jazz",
    descripcion: "Una noche de jazz en vivo",
    categoriaId: "categoria-musica",
    fecha: new Date(AHORA.getTime() + 10 * DIA),
    lugar: "Teatro Sur, CABA",
    organizadorId: organizador.id,
    tiposEntrada: [
      { id: "tipo-general", nombre: "General", precio: 15000, cupo: 100 },
      { id: "tipo-vip", nombre: "VIP", precio: 45000, cupo: 10 },
    ],
    multimedia: [{ ruta: "uploads/afiche.jpg", tipo: "imagen", alt: "Afiche del concierto" }],
    ...sobrescribir,
  };
}

export function crearEvento(sobrescribir = {}) {
  return new Evento(datosEvento(sobrescribir));
}

/** Crea una compra PENDIENTE válida (reserva cupo sobre el evento). */
export function crearCompra({
  evento = crearEvento(),
  reloj = relojFijo(),
  tipoEntradaId = "tipo-vip",
  cantidad = 2,
  quien = comprador,
} = {}) {
  const compra = Compra.crear({ comprador: quien, evento, tipoEntradaId, cantidad, reloj });
  compra.id = "compra-1";
  return { compra, evento, reloj };
}
