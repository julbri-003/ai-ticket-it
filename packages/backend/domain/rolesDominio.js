export const Roles = Object.freeze({
  COMPRADOR: "COMPRADOR",
  ORGANIZADOR: "ORGANIZADOR",
});

export const esRolValido = (rol) => Object.values(Roles).includes(rol);
