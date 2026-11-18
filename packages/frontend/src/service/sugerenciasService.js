import { normalizarNombreCategoria } from "../components/eventos/iconosCategoria";
import { MAX_CARACTERES_MENSAJE } from "./mensajesService";

// Sugerencias de escritura (spec 11): ayudas para el chat y para crear eventos. Son funciones
// puras: nunca envían ni guardan nada por su cuenta.

export const MAX_DESCRIPCION = 5000;
const MAX_SUGERENCIAS_CHAT = 6;

const nombreDePila = (nombre) => (nombre ?? "").trim().split(/\s+/)[0] || null;

// ----- Chat -----

const PREGUNTAS_COMPRADOR = [
  "¡Hola! ¿Hay código de vestimenta?",
  "¿El evento es al aire libre o techado?",
  "¿A qué hora abren las puertas?",
  "¿Se puede ingresar con comida o bebida?",
  "¿Hay estacionamiento cerca?",
  "¿Es apto para menores?",
];

/**
 * Mensajes sugeridos para empezar una conversación (hasta 6). El comprador recibe preguntas
 * frecuentes; el organizador, respuestas típicas según el estado de la compra. Una sugerencia
 * con un dato faltante no se incluye (nunca "undefined").
 */
export function sugerenciasChat({ rol, compra } = {}) {
  const evento = compra?.evento ?? {};
  let lista;
  if (rol === "ORGANIZADOR") {
    const nombre = nombreDePila(compra?.compradorNombre);
    const porEstado = {
      PENDIENTE: compra?.fechaLimitePagoTexto
        ? `Te recuerdo que tenés hasta el ${compra.fechaLimitePagoTexto} para pagar tu reserva.`
        : null,
      CONFIRMADA: evento.lugar ? `¡Tu pago quedó confirmado! Nos vemos en ${evento.lugar}.` : null,
      CANCELADA: "Lamentamos que no puedas venir. Si necesitás algo, avisame.",
      REEMBOLSADA: "Lamentamos que no puedas venir. Si necesitás algo, avisame.",
    };
    lista = [
      evento.nombre
        ? `¡Gracias por tu compra para ${evento.nombre}! Te recomiendo llegar temprano.`
        : null,
      nombre ? `¡Hola ${nombre}! Cualquier duda sobre el evento, escribime por acá.` : null,
      porEstado[compra?.estado] ?? null,
      "Las puertas abren una hora antes del inicio.",
    ];
  } else {
    lista = PREGUNTAS_COMPRADOR.map((texto) =>
      texto === "¿Hay estacionamiento cerca?" && !evento.ubicacion
        ? "¿Me pasás la dirección exacta?"
        : texto,
    );
  }
  return lista
    .filter(Boolean)
    .filter((t) => t.length <= MAX_CARACTERES_MENSAJE)
    .slice(0, MAX_SUGERENCIAS_CHAT);
}

// ----- Crear evento -----

const EJEMPLOS_NOMBRE = {
  recitales: "Ej.: Noche de rock en el Club Sur",
  teatro: "Ej.: Esperando la carroza, función de estreno",
  "stand-up": "Ej.: Stand-up de los jueves en el Bar Central",
  festivales: "Ej.: Festival de verano en la Costanera",
  deportes: "Ej.: Final del torneo de básquet barrial",
  conferencias: "Ej.: Jornada de diseño y tecnología 2026",
  infantiles: "Ej.: Títeres en la plaza para los más chicos",
  danza: "Ej.: Gala de tango en el Teatro Regio",
};

/** Placeholder del nombre según la categoría (o uno genérico). */
export function ejemploNombre(categoria) {
  return (
    EJEMPLOS_NOMBRE[normalizarNombreCategoria(categoria ?? "")] ?? "Ej.: Noche de jazz en vivo"
  );
}

const IDEAS_COMUNES = [
  "Duración aproximada",
  "Apertura de puertas",
  "Código de vestimenta",
  "Al aire libre o techado",
  "Edad mínima",
  "Accesibilidad del lugar",
  "Qué incluye la entrada",
];

const IDEAS_POR_CATEGORIA = {
  recitales: ["Banda soporte", "Lista de temas"],
  teatro: ["Elenco", "Dirección"],
  "stand-up": ["Contenido para adultos"],
  festivales: ["Line-up por día", "Zona de comidas"],
  deportes: ["Sectores de la cancha"],
  conferencias: ["Oradores", "Certificado de asistencia"],
  infantiles: ["Edad recomendada"],
  danza: ["Compañía", "Estilo"],
};

/** Ideas para la descripción: las de la categoría primero (máx. 3) y después las comunes. */
export function ideasDescripcion(categoria) {
  const propias = (IDEAS_POR_CATEGORIA[normalizarNombreCategoria(categoria ?? "")] ?? []).slice(
    0,
    3,
  );
  return [...propias, ...IDEAS_COMUNES];
}

const rotulo = (idea) => `${idea}: `;

/** true si la descripción ya tiene una línea que empieza con el rótulo de la idea. */
export function ideaUsada(descripcion, idea) {
  const buscado = `${idea}:`.toLowerCase();
  return (descripcion ?? "")
    .split("\n")
    .some((linea) => linea.trim().toLowerCase().startsWith(buscado));
}

/**
 * Agrega "Idea: " en una línea nueva al final. Devuelve { descripcion, agregada }: no agrega si
 * ya estaba o si no entra en el máximo de la descripción.
 */
export function agregarIdea(descripcion, idea, maximo = MAX_DESCRIPCION) {
  const actual = descripcion ?? "";
  if (ideaUsada(actual, idea)) return { descripcion: actual, agregada: false, motivo: "usada" };
  const base = actual.replace(/\s+$/, "");
  const nueva = `${base}${base ? "\n" : ""}${rotulo(idea)}`;
  if (nueva.length > maximo) return { descripcion: actual, agregada: false, motivo: "maximo" };
  return { descripcion: nueva, agregada: true };
}

const TIPOS_COMUNES = ["General", "VIP", "Preventa"];
const TIPOS_POR_CATEGORIA = {
  recitales: ["Campo", "Platea"],
  festivales: ["Campo", "Platea"],
  teatro: ["Platea", "Pullman"],
  deportes: ["Popular", "Platea"],
  conferencias: ["Estudiantes"],
};

/** Nombres de tipos de entrada sugeridos según la categoría (sin repetir). */
export function tiposSugeridos(categoria) {
  const propios = TIPOS_POR_CATEGORIA[normalizarNombreCategoria(categoria ?? "")] ?? [];
  return [...new Set([...TIPOS_COMUNES, ...propios])];
}
