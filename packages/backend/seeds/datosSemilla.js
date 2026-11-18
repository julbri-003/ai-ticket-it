// Datos de demo. Todas las fechas son relativas al momento de sembrar (horas desde "ahora"):
// valores negativos = en el pasado. Nada está hardcodeado a una fecha fija.

export const PASSWORD_DEMO = "Ticket123!";

const DIA = 24;

export const CATEGORIAS = [
  {
    nombre: "Recitales",
    descripcion: "Música en vivo: bandas, solistas y orquestas",
    imagen: "recitales",
  },
  {
    nombre: "Teatro",
    descripcion: "Obras de teatro, musicales y lecturas dramatizadas",
    imagen: "teatro",
  },
  { nombre: "Stand-up", descripcion: "Comedia en vivo y monólogos", imagen: "stand-up" },
  {
    nombre: "Festivales",
    descripcion: "Festivales de varios días, ferias y encuentros",
    imagen: "festivales",
  },
  { nombre: "Deportes", descripcion: "Partidos, torneos y carreras", imagen: "deportes" },
  { nombre: "Conferencias", descripcion: "Charlas, jornadas y talleres", imagen: "conferencias" },
  { nombre: "Infantiles", descripcion: "Espectáculos para chicas y chicos", imagen: "infantiles" },
  { nombre: "Danza", descripcion: "Tango, folklore, contemporáneo y clásico", imagen: "danza" },
];

/** Texto alternativo de cada afiche de relleno (describe la imagen, no el evento). */
export const ALT_IMAGENES = {
  recitales: "Afiche abstracto: círculos concéntricos dorados y crema sobre fondo bordó y negro",
  teatro: "Afiche abstracto: telón de franjas rojas y un círculo dorado sobre fondo negro",
  "stand-up": "Afiche abstracto: un micrófono rojo bajo un haz de luz crema sobre fondo oscuro",
  festivales: "Afiche abstracto: banderines dorados y crema sobre fondo bordó",
  deportes: "Afiche abstracto: líneas de una cancha y una pelota dorada sobre fondo azul oscuro",
  conferencias: "Afiche abstracto: un atril color crema con un círculo bordó sobre fondo oscuro",
  infantiles: "Afiche abstracto: tres globos rojos y azul sobre fondo marfil",
  danza: "Afiche abstracto: una espiral dorada y crema sobre fondo negro y bordó",
};

// clave → datos. Las claves se usan para referenciar usuarios en eventos y compras.
export const ORGANIZADORES = {
  lucia: { nombre: "Lucía", apellido: "Ferrari", email: "lucia@ticketit.test" },
  martin: { nombre: "Martín", apellido: "Ocampo", email: "martin@ticketit.test" },
  sofia: { nombre: "Sofía", apellido: "Benítez", email: "sofia@ticketit.test" },
};

// Ana y Bruno concentran sus favoritos en 1–2 categorías ("Recomendados para vos");
// Diego no tiene favoritos (estado vacío).
export const COMPRADORES = {
  ana: {
    nombre: "Ana",
    apellido: "Gómez",
    email: "ana@ticketit.test",
    favoritos: ["acustico", "jazz", "rock", "folklore", "primavera"],
  },
  bruno: {
    nombre: "Bruno",
    apellido: "Díaz",
    email: "bruno@ticketit.test",
    favoritos: ["risas", "estrenos", "hamlet"],
  },
  carla: {
    nombre: "Carla",
    apellido: "Ruiz",
    email: "carla@ticketit.test",
    favoritos: ["innovacion"],
  },
  diego: { nombre: "Diego", apellido: "Sosa", email: "diego@ticketit.test", favoritos: [] },
};

const tipo = (id, nombre, precio, cupo, descripcion = "") => ({
  id,
  nombre,
  precio,
  cupo,
  descripcion,
});

export const EVENTOS = {
  // ----- Futuros -----
  jazz: {
    nombre: "Noche de Jazz en el Sótano",
    descripcion:
      "Un cuarteto de jazz de la escena porteña presenta standards y temas propios en un sótano íntimo.",
    categoria: "Recitales",
    organizador: "lucia",
    lugar: "Club del Sótano, San Telmo, CABA",
    enHoras: 5 * DIA,
    tipos: [
      tipo("general", "General", 18000, 120),
      tipo("vip", "VIP", 42000, 20, "Mesa cerca del escenario y una copa"),
    ],
  },
  rock: {
    nombre: "Rock Nacional: Clásicos en vivo",
    descripcion: "Una banda tributo recorre cuarenta años de rock nacional, de los setenta a hoy.",
    categoria: "Recitales",
    organizador: "lucia",
    lugar: "Estadio Obras, CABA",
    ubicacion: { lat: -34.5466, lng: -58.4588, direccion: "Av. del Libertador 7395, CABA" },
    enHoras: 12 * DIA,
    tipos: [tipo("campo", "Campo", 25000, 400), tipo("platea", "Platea", 38000, 150)],
  },
  folklore: {
    nombre: "Folklore bajo las estrellas",
    descripcion: "Peña folklórica al aire libre con músicos invitados y baile.",
    categoria: "Recitales",
    organizador: "lucia",
    lugar: "Parque Centenario, CABA",
    ubicacion: {
      lat: -34.6066,
      lng: -58.4358,
      direccion: "Av. Patricias Argentinas y Av. Díaz Vélez, CABA",
    },
    enHoras: 30, // en menos de 48 h: la compra pendiente vence a la hora del evento
    tipos: [tipo("general", "General", 12000, 80)],
  },
  primavera: {
    nombre: "Festival Primavera Sonora",
    descripcion:
      "Dos días de música, gastronomía y arte con más de veinte artistas en tres escenarios.",
    categoria: "Festivales",
    organizador: "lucia",
    lugar: "Hipódromo de Palermo, CABA",
    ubicacion: { lat: -34.5692, lng: -58.4252, direccion: "Av. del Libertador 4101, CABA" },
    enHoras: 20 * DIA,
    tipos: [tipo("dia", "Abono 1 día", 30000, 500), tipo("dos-dias", "Abono 2 días", 52000, 300)],
  },
  foodtrucks: {
    nombre: "Feria de Food Trucks y Música",
    descripcion: "Feria gastronómica con food trucks, DJ en vivo y espacio para chicos.",
    categoria: "Festivales",
    organizador: "lucia",
    lugar: "Costanera Sur, CABA",
    ubicacion: {
      lat: -34.6131,
      lng: -58.36,
      direccion: "Av. Tristán Achával Rodríguez 1600, CABA",
    },
    enHoras: 8 * DIA,
    tipos: [tipo("entrada", "Entrada", 5000, 1000)],
  },
  hamlet: {
    nombre: "Hamlet, versión de bolsillo",
    descripcion:
      "Una versión condensada y contemporánea del clásico de Shakespeare, con cuatro actores.",
    categoria: "Teatro",
    organizador: "martin",
    lugar: "Teatro del Pueblo, CABA",
    enHoras: 7 * DIA,
    tipos: [tipo("platea", "Platea", 22000, 100), tipo("pullman", "Pullman", 15000, 60)],
    ampliaciones: [
      { texto: "Se suma una charla con el elenco al terminar la función.", haceHoras: 2 * DIA },
    ],
  },
  bernarda: {
    nombre: "La Casa de Bernarda Alba",
    descripcion: "El drama de Federico García Lorca en una puesta despojada y potente.",
    categoria: "Teatro",
    organizador: "martin",
    lugar: "Teatro Regio, CABA",
    ubicacion: { lat: -34.5868, lng: -58.4413, direccion: "Av. Córdoba 6056, CABA" },
    enHoras: 15 * DIA,
    tipos: [tipo("general", "General", 19000, 90)],
  },
  risas: {
    nombre: "Risas de Martes",
    descripcion: "Cinco comediantes, cinco estilos y una noche de stand-up para cortar la semana.",
    categoria: "Stand-up",
    organizador: "martin",
    lugar: "Paseo La Plaza, CABA",
    ubicacion: { lat: -34.6044, lng: -58.3906, direccion: "Av. Corrientes 1660, CABA" },
    enHoras: 3 * DIA,
    tipos: [tipo("general", "General", 9000, 60)],
  },
  estrenos: {
    nombre: "Stand-up: Noche de Estrenos",
    descripcion: "Comediantes nuevos prueban material inédito frente al público. Sala muy chica.",
    categoria: "Stand-up",
    organizador: "martin",
    lugar: "Bar Cultural Almagro, CABA",
    enHoras: 10 * DIA,
    tipos: [tipo("general", "General", 11000, 2)], // queda agotado con una compra
  },
  tango: {
    nombre: "Tango y Contemporáneo",
    descripcion: "Una compañía de danza cruza el tango con la danza contemporánea.",
    categoria: "Danza",
    organizador: "martin",
    lugar: "Centro Cultural Kirchner, CABA",
    ubicacion: { lat: -34.6033, lng: -58.3687, direccion: "Sarmiento 151, CABA" },
    enHoras: 18 * DIA,
    tipos: [tipo("platea", "Platea", 16000, 80)],
  },
  basquet: {
    nombre: "Final del Torneo Regional de Básquet",
    descripcion: "La final del torneo regional, con show de medio tiempo.",
    categoria: "Deportes",
    organizador: "sofia",
    lugar: "Estadio Cubierto Malvinas Argentinas, CABA",
    enHoras: 6 * DIA,
    tipos: [tipo("popular", "Popular", 7000, 600), tipo("platea", "Platea", 14000, 200)],
  },
  innovacion: {
    nombre: "Jornada de Innovación y Diseño",
    descripcion:
      "Charlas sobre diseño de producto, accesibilidad y tecnología, con talleres por la tarde.",
    categoria: "Conferencias",
    organizador: "sofia",
    lugar: "Usina del Arte, CABA",
    ubicacion: { lat: -34.6286, lng: -58.357, direccion: "Agustín R. Caffarena 1, La Boca, CABA" },
    enHoras: 9 * DIA,
    tipos: [tipo("general", "General", 4500, 250), tipo("taller", "Con taller", 9500, 40)],
  },
  titeres: {
    nombre: "Títeres en la plaza",
    descripcion: "Función de títeres para toda la familia, con canciones y juegos.",
    categoria: "Infantiles",
    organizador: "sofia",
    lugar: "Plaza Irlanda, CABA",
    ubicacion: { lat: -34.6151, lng: -58.4497, direccion: "Av. Gaona y Donato Álvarez, CABA" },
    enHoras: 4 * DIA,
    tipos: [tipo("ninos", "Niños", 3000, 100), tipo("adultos", "Adultos", 4500, 100)],
  },
  // ----- Pasados (quedan finalizados: baja lógica, visibles en "Eventos anteriores") -----
  acustico: {
    nombre: "Recital Acústico de Otoño",
    descripcion: "Un recital acústico con cuerdas y voces en una sala con muy buena acústica.",
    categoria: "Recitales",
    organizador: "lucia",
    lugar: "Auditorio de Belgrano, CABA",
    enHoras: -10 * DIA,
    tipos: [
      tipo("general", "General", 15000, 150),
      tipo("platea", "Platea preferencial", 24000, 40),
    ],
  },
  enredos: {
    nombre: "Comedia de Enredos",
    descripcion: "Una comedia de puertas que se abren y se cierran, con malentendidos en cadena.",
    categoria: "Teatro",
    organizador: "martin",
    lugar: "Teatro Maipo, CABA",
    ubicacion: { lat: -34.6029, lng: -58.3774, direccion: "Esmeralda 443, CABA" },
    enHoras: -3 * DIA,
    tipos: [tipo("platea", "Platea", 20000, 120), tipo("pullman", "Pullman", 14000, 80)],
  },
  maraton: {
    nombre: "Maratón Urbana 10K",
    descripcion: "Carrera de 10 km por los bosques de Palermo, con kit de corredor incluido.",
    categoria: "Deportes",
    organizador: "sofia",
    lugar: "Bosques de Palermo, CABA",
    ubicacion: {
      lat: -34.5715,
      lng: -58.418,
      direccion: "Av. Infanta Isabel y Av. Sarmiento, CABA",
    },
    enHoras: -20 * DIA,
    tipos: [tipo("corredor", "Corredor", 18000, 1000)],
  },
};

/**
 * Compras en todos los estados. `pasos` se aplican en orden con el reloj en `en` (horas desde
 * ahora): crear, pagar, cancelar, vencer, reembolsar, reembolsarAuto, utilizar.
 */
export const COMPRAS = [
  // CONFIRMADA, con chat.
  {
    evento: "jazz",
    comprador: "ana",
    tipo: "vip",
    cantidad: 2,
    pasos: [
      ["crear", -2 * DIA],
      ["pagar", -2 * DIA + 1],
    ],
    mensajes: [
      ["comprador", "¡Hola! ¿Hay estacionamiento cerca del club?", -DIA],
      [
        "organizador",
        "Hola Ana, sí: hay uno a media cuadra con descuento mostrando la entrada.",
        -DIA + 2,
      ],
    ],
  },
  // PENDIENTE de un evento en menos de 48 h: vence a la hora del evento.
  { evento: "folklore", comprador: "ana", tipo: "general", cantidad: 2, pasos: [["crear", -1]] },
  // PENDIENTE común (vence a las 48 h).
  { evento: "risas", comprador: "bruno", tipo: "general", cantidad: 3, pasos: [["crear", -3]] },
  // CONFIRMADA que agota el evento.
  {
    evento: "estrenos",
    comprador: "bruno",
    tipo: "general",
    cantidad: 2,
    pasos: [
      ["crear", -DIA],
      ["pagar", -DIA + 1],
    ],
  },
  // CONFIRMADA.
  {
    evento: "rock",
    comprador: "diego",
    tipo: "campo",
    cantidad: 2,
    pasos: [
      ["crear", -DIA],
      ["pagar", -DIA + 2],
    ],
  },
  // CANCELADA (VENCIDA): 48 h sin pago.
  {
    evento: "innovacion",
    comprador: "carla",
    tipo: "taller",
    cantidad: 1,
    pasos: [
      ["crear", -5 * DIA],
      ["vencer", -3 * DIA],
    ],
  },
  // CANCELADA por el comprador antes de pagar (sin reembolso).
  {
    evento: "hamlet",
    comprador: "ana",
    tipo: "platea",
    cantidad: 2,
    pasos: [
      ["crear", -4 * DIA],
      ["cancelar", -4 * DIA + 2],
    ],
  },
  // CANCELADA con reembolso pendiente (el organizador tiene ~19 h para reembolsar).
  {
    evento: "primavera",
    comprador: "bruno",
    tipo: "dos-dias",
    cantidad: 2,
    pasos: [
      ["crear", -3 * DIA],
      ["pagar", -3 * DIA + 1],
      ["cancelar", -5],
    ],
    mensajes: [
      [
        "comprador",
        "Tuve que cancelar porque no puedo viajar. ¿Cuándo se acredita el reembolso?",
        -4,
      ],
    ],
  },
  // REEMBOLSADA por el organizador.
  {
    evento: "basquet",
    comprador: "carla",
    tipo: "platea",
    cantidad: 4,
    pasos: [
      ["crear", -6 * DIA],
      ["pagar", -6 * DIA + 1],
      ["cancelar", -5 * DIA],
      ["reembolsar", -5 * DIA + 3],
    ],
    mensajes: [
      ["comprador", "Cancelé por un viaje de trabajo, ¡perdón!", -5 * DIA + 1],
      ["organizador", "No hay problema, Carla. Ya te hicimos el reembolso.", -5 * DIA + 3],
    ],
  },
  // REEMBOLSADA automáticamente (el organizador no reembolsó en 24 h).
  {
    evento: "titeres",
    comprador: "diego",
    tipo: "ninos",
    cantidad: 3,
    pasos: [
      ["crear", -4 * DIA],
      ["pagar", -4 * DIA + 1],
      ["cancelar", -3 * DIA],
      ["reembolsarAuto", -2 * DIA],
    ],
  },
  // UTILIZADAS de eventos pasados, con reseña.
  {
    evento: "acustico",
    comprador: "ana",
    tipo: "general",
    cantidad: 2,
    pasos: [
      ["crear", -15 * DIA],
      ["pagar", -15 * DIA + 1],
      ["utilizar", -10 * DIA],
    ],
    resenia: {
      puntuacion: 5,
      detalle: "Un sonido impecable y una sala hermosa. ¡Volvería mil veces!",
      en: -9 * DIA,
    },
  },
  {
    evento: "enredos",
    comprador: "bruno",
    tipo: "platea",
    cantidad: 2,
    pasos: [
      ["crear", -8 * DIA],
      ["pagar", -8 * DIA + 2],
      ["utilizar", -3 * DIA],
    ],
    resenia: {
      puntuacion: 4.5,
      detalle: "Muy divertida. El segundo acto se hace un poco largo.",
      en: -2 * DIA,
    },
    mensajes: [
      ["comprador", "¿La función empieza puntual?", -4 * DIA],
      ["organizador", "Sí, a las 21 en punto.", -4 * DIA + 1],
    ],
  },
  {
    evento: "maraton",
    comprador: "carla",
    tipo: "corredor",
    cantidad: 1,
    pasos: [
      ["crear", -30 * DIA],
      ["pagar", -30 * DIA + 1],
      ["utilizar", -20 * DIA],
    ],
    resenia: {
      puntuacion: 4,
      detalle: "Muy bien organizada. Faltó un puesto de hidratación más.",
      en: -19 * DIA,
    },
  },
  // UTILIZADAS sin reseña: para mostrar en el video cómo se califica.
  {
    evento: "enredos",
    comprador: "diego",
    tipo: "pullman",
    cantidad: 1,
    pasos: [
      ["crear", -6 * DIA],
      ["pagar", -6 * DIA + 1],
      ["utilizar", -3 * DIA],
    ],
  },
  {
    evento: "enredos",
    comprador: "ana",
    tipo: "pullman",
    cantidad: 2,
    pasos: [
      ["crear", -7 * DIA],
      ["pagar", -7 * DIA + 1],
      ["utilizar", -3 * DIA],
    ],
  },
];
