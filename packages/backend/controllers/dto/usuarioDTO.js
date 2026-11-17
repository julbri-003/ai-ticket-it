import { Roles } from "../../domain/rolesDominio.js";

/** Usuario sin passwordHash ni campos internos. */
export function usuarioToDTO(usuario) {
  const dto = {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
  };
  if (usuario.rol === Roles.ORGANIZADOR) {
    dto.puntajePromedio = redondearPuntaje(usuario.puntajePromedio);
    dto.cantidadResenias = usuario.cantidadResenias ?? 0;
  }
  return dto;
}

/** Datos públicos del organizador que se muestran junto a sus eventos. */
export function organizadorToDTO(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellido}`,
    puntajePromedio: redondearPuntaje(usuario.puntajePromedio),
    cantidadResenias: usuario.cantidadResenias ?? 0,
  };
}

function redondearPuntaje(puntaje) {
  return Math.round((puntaje ?? 0) * 100) / 100;
}
