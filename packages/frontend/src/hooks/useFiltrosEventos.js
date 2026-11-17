import { useCallback, useMemo, useState } from "react";
import { textoAFechaIso } from "../utils/fechas";

export const LIMITE_PAGINA = 10;

export const FILTROS_INICIALES = {
  q: "",
  paraVos: false,
  categoriaIds: [],
  orden: "fecha",
  direccion: null,
  precioMin: "",
  precioMax: "",
  fechaDesde: "",
  fechaHasta: "",
  conDisponibilidad: false,
  puntajeMin: null,
  anteriores: false,
  pagina: 1,
};

const numero = (texto) => {
  const limpio = String(texto ?? "")
    .trim()
    .replace(",", ".");
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : NaN;
};

/** Errores de los rangos del panel (precio y fechas). Objeto vacío si todo está bien. */
export function validarFiltros(f) {
  const errores = {};
  const min = numero(f.precioMin);
  const max = numero(f.precioMax);
  if (Number.isNaN(min) || (min != null && min < 0))
    errores.precioMin = "Ingresá un precio válido.";
  if (Number.isNaN(max) || (max != null && max < 0))
    errores.precioMax = "Ingresá un precio válido.";
  if (!errores.precioMin && !errores.precioMax && min != null && max != null && min > max) {
    errores.precioMax = "El máximo tiene que ser mayor o igual al mínimo.";
  }
  const desde = f.fechaDesde ? textoAFechaIso(f.fechaDesde) : null;
  const hasta = f.fechaHasta ? textoAFechaIso(f.fechaHasta) : null;
  if (f.fechaDesde && !desde) errores.fechaDesde = "Usá el formato DD/MM/AAAA.";
  if (f.fechaHasta && !hasta) errores.fechaHasta = "Usá el formato DD/MM/AAAA.";
  if (desde && hasta && desde > hasta)
    errores.fechaHasta = "La fecha hasta no puede ser anterior a la fecha desde.";
  return errores;
}

/** Cantidad de filtros del panel activos (para el contador del botón "Filtros"). */
export function contarFiltrosPanel(f) {
  let cantidad = 0;
  if (f.precioMin !== "" || f.precioMax !== "") cantidad += 1;
  if (f.fechaDesde || f.fechaHasta) cantidad += 1;
  if (f.conDisponibilidad) cantidad += 1;
  if (f.puntajeMin != null) cantidad += 1;
  if (f.orden !== "fecha" || f.direccion) cantidad += 1;
  return cantidad;
}

/** Query para eventosService.buscar a partir del estado de los filtros. */
export function armarQuery(f) {
  const query = { pagina: f.pagina, limite: LIMITE_PAGINA, orden: f.orden };
  if (f.q.trim()) query.q = f.q.trim();
  if (f.paraVos) query.paraVos = "true";
  if (f.categoriaIds.length) query.categoriaIds = f.categoriaIds.join(",");
  if (f.direccion) query.direccion = f.direccion;
  const min = numero(f.precioMin);
  const max = numero(f.precioMax);
  if (min != null && !Number.isNaN(min)) query.precioMin = min;
  if (max != null && !Number.isNaN(max)) query.precioMax = max;
  const desde = textoAFechaIso(f.fechaDesde);
  const hasta = textoAFechaIso(f.fechaHasta);
  if (desde) query.fechaDesde = desde;
  if (hasta) query.fechaHasta = hasta;
  if (f.conDisponibilidad) query.conDisponibilidad = "true";
  if (f.puntajeMin != null) query.puntajeMin = f.puntajeMin;
  if (f.anteriores) query.anteriores = "true";
  return query;
}

const ORDENES = { fecha: "Fecha", precio: "Precio", puntaje: "Puntaje", relevancia: "Relevancia" };

/** Pills de filtros aplicados: { clave, etiqueta } (la clave se usa para quitarlo). */
export function pillsAplicadas(f, categorias = []) {
  const pills = [];
  if (f.q.trim()) pills.push({ clave: "q", etiqueta: `“${f.q.trim()}”` });
  if (f.paraVos) pills.push({ clave: "paraVos", etiqueta: "✦ Para vos" });
  for (const id of f.categoriaIds) {
    pills.push({
      clave: `categoria:${id}`,
      etiqueta: categorias.find((c) => c.id === id)?.nombre ?? "Categoría",
    });
  }
  if (f.precioMin !== "" || f.precioMax !== "") {
    pills.push({ clave: "precio", etiqueta: `$ ${f.precioMin || "0"} – ${f.precioMax || "…"}` });
  }
  if (f.fechaDesde || f.fechaHasta) {
    pills.push({ clave: "fechas", etiqueta: `${f.fechaDesde || "…"} → ${f.fechaHasta || "…"}` });
  }
  if (f.conDisponibilidad) pills.push({ clave: "conDisponibilidad", etiqueta: "Con entradas" });
  if (f.puntajeMin != null)
    pills.push({ clave: "puntajeMin", etiqueta: `${String(f.puntajeMin).replace(".", ",")}+ ★` });
  if (f.orden !== "fecha" || f.direccion) {
    pills.push({
      clave: "orden",
      etiqueta: `Orden: ${ORDENES[f.orden]}${f.direccion === "desc" ? " ↓" : f.direccion === "asc" ? " ↑" : ""}`,
    });
  }
  return pills;
}

/** Quita un filtro por su clave de pill. */
export function quitarFiltro(f, clave) {
  const base = { ...f, pagina: 1 };
  if (clave.startsWith("categoria:")) {
    const id = clave.slice("categoria:".length);
    return { ...base, categoriaIds: f.categoriaIds.filter((c) => c !== id) };
  }
  switch (clave) {
    case "q":
      return { ...base, q: "" };
    case "paraVos":
      return { ...base, paraVos: false, orden: f.orden === "relevancia" ? "fecha" : f.orden };
    case "precio":
      return { ...base, precioMin: "", precioMax: "" };
    case "fechas":
      return { ...base, fechaDesde: "", fechaHasta: "" };
    case "conDisponibilidad":
      return { ...base, conDisponibilidad: false };
    case "puntajeMin":
      return { ...base, puntajeMin: null };
    case "orden":
      return { ...base, orden: "fecha", direccion: null };
    default:
      return base;
  }
}

/**
 * Estado de los filtros del buscador. Vive en Explorar (que no se desmonta al ir al detalle),
 * así se conserva al volver. Cualquier cambio de filtro vuelve a la página 1.
 */
export function useFiltrosEventos(iniciales = {}) {
  const [filtros, setFiltros] = useState({ ...FILTROS_INICIALES, ...iniciales });

  const aplicar = useCallback(
    (parcial) => setFiltros((f) => ({ ...f, ...parcial, pagina: 1 })),
    [],
  );
  const setPagina = useCallback((pagina) => setFiltros((f) => ({ ...f, pagina })), []);
  const quitar = useCallback((clave) => setFiltros((f) => quitarFiltro(f, clave)), []);
  const limpiar = useCallback(
    () => setFiltros((f) => ({ ...FILTROS_INICIALES, anteriores: f.anteriores })),
    [],
  );
  const toggleCategoria = useCallback(
    (id) =>
      setFiltros((f) => ({
        ...f,
        pagina: 1,
        categoriaIds: f.categoriaIds.includes(id)
          ? f.categoriaIds.filter((c) => c !== id)
          : [...f.categoriaIds, id],
      })),
    [],
  );
  const toggleParaVos = useCallback(
    () =>
      setFiltros((f) => ({
        ...f,
        pagina: 1,
        paraVos: !f.paraVos,
        orden: f.paraVos && f.orden === "relevancia" ? "fecha" : f.orden,
      })),
    [],
  );

  const query = useMemo(() => armarQuery(filtros), [filtros]);
  const errores = useMemo(() => validarFiltros(filtros), [filtros]);
  const filtrosActivos = useMemo(() => contarFiltrosPanel(filtros), [filtros]);

  return {
    filtros,
    query,
    errores,
    filtrosActivos,
    aplicar,
    setPagina,
    quitar,
    limpiar,
    toggleCategoria,
    toggleParaVos,
  };
}
