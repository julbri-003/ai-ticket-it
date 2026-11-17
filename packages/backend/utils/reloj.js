// Reloj inyectable: toda regla temporal lo recibe para poder testearse con una fecha fija.
export const reloj = {
  ahora: () => new Date(),
};

export default reloj;
