import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { Categoria } from "../domain/categoriaDominio.js";
import { Compra } from "../domain/compraDominio.js";
import { ACTOR_SISTEMA } from "../domain/estadoCompraDominio.js";
import { Evento } from "../domain/eventoDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import { Usuario } from "../domain/usuarioDominio.js";
import { nuevoId } from "../repositories/mongo/ids.js";
import { AvisosComprasService } from "../services/AvisosComprasService.js";
import { NotificacionesService } from "../services/NotificacionesService.js";
import { TiposNotificacion } from "../templates/notificacionTemplates.js";
import {
  ALT_IMAGENES,
  CATEGORIAS,
  COMPRADORES,
  COMPRAS,
  EVENTOS,
  ORGANIZADORES,
  PASSWORD_DEMO,
} from "./datosSemilla.js";

const MS_POR_HORA = 60 * 60 * 1000;
const DIR_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
export const CARPETA_IMAGENES_SEMILLA = "semilla";

/** Reloj fijo en `horas` desde el ahora real de la siembra. */
function relojEn(ahora, horas) {
  const fecha = new Date(ahora.getTime() + horas * MS_POR_HORA);
  return { ahora: () => new Date(fecha) };
}

/** Copia de la compra en un momento dado (para notificar con el estado de ese momento). */
const foto = (compra) => Object.assign(Object.create(Compra.prototype), structuredClone(compra));

const actor = (usuario) => ({ id: usuario.id, nombre: usuario.nombreCompleto, rol: usuario.rol });

/** Copia los afiches de seeds/assets a UPLOADS_DIR/semilla (si todavía no están). */
function copiarImagenes(uploadsDir) {
  const destino = path.join(uploadsDir, CARPETA_IMAGENES_SEMILLA);
  fs.mkdirSync(destino, { recursive: true });
  for (const archivo of fs.readdirSync(DIR_ASSETS)) {
    const final = path.join(destino, archivo);
    if (!fs.existsSync(final)) fs.copyFileSync(path.join(DIR_ASSETS, archivo), final);
  }
}

async function asegurarCategorias(categoriasRepository) {
  const porNombre = {};
  let creadas = 0;
  for (const { nombre, descripcion } of CATEGORIAS) {
    let categoria = await categoriasRepository.obtenerPorNombre(nombre, { incluirInactivos: true });
    if (!categoria) {
      categoria = await categoriasRepository.guardar(new Categoria({ nombre, descripcion }));
      creadas += 1;
    }
    porNombre[nombre] = categoria;
  }
  return { porNombre, creadas };
}

async function asegurarUsuarios(usuariosRepository, definiciones, rol, passwordHash) {
  const porClave = {};
  const nuevos = new Set();
  for (const [clave, datos] of Object.entries(definiciones)) {
    let usuario = await usuariosRepository.obtenerPorEmail(datos.email, { incluirInactivos: true });
    if (!usuario) {
      usuario = await usuariosRepository.guardar(
        new Usuario({ ...datos, favoritos: [], rol, passwordHash }),
      );
      nuevos.add(clave);
    }
    porClave[clave] = usuario;
  }
  return { porClave, nuevos };
}

function aplicarPaso(compra, evento, paso, reloj, comprador, organizador) {
  switch (paso) {
    case "pagar":
      return compra.pagar(actor(comprador), reloj);
    case "cancelar":
      return compra.cancelar(evento, actor(comprador), reloj);
    case "vencer":
      return compra.vencer(evento, reloj);
    case "reembolsar":
      return compra.reembolsar(actor(organizador), reloj);
    case "reembolsarAuto":
      return compra.reembolsarAutomaticamente(reloj);
    case "utilizar":
      return compra.marcarUtilizada(evento, reloj);
    default:
      throw new Error(`Paso de semilla desconocido: ${paso}`);
  }
}

/**
 * Siembra los datos de demo. Idempotente: categorías por nombre, usuarios por email y eventos
 * por nombre; las compras y reseñas de un evento solo se crean junto con el evento.
 * Las compras se arman con el dominio, avanzando un reloj simulado, para que el historial,
 * el cupo, los mensajes y las reseñas queden coherentes con las reglas reales.
 */
export async function sembrarDatos({
  usuariosRepository,
  categoriasRepository,
  eventosRepository,
  comprasRepository,
  reseniasRepository,
  notificacionesRepository = null,
  reloj,
  uploadsDir = process.env.UPLOADS_DIR || "uploads",
  log = () => {},
}) {
  const ahora = reloj.ahora();
  const resumen = {
    categorias: 0,
    usuarios: 0,
    eventos: 0,
    compras: 0,
    resenias: 0,
    notificaciones: 0,
  };

  // Las notificaciones de la demo se generan con los mismos services que el flujo real, con el
  // reloj en el momento de cada transición. Sin repositorio de notificaciones, no se generan.
  const relojAvisos = { fecha: ahora, ahora: () => new Date(relojAvisos.fecha) };
  const sinSocket = { emitirAUsuario() {}, emitirACompra() {} };
  const notificaciones = notificacionesRepository
    ? new NotificacionesService({ notificacionesRepository, emisor: sinSocket, reloj: relojAvisos })
    : null;
  const avisos = notificaciones
    ? new AvisosComprasService({
        notificacionesService: notificaciones,
        eventosRepository,
        emisor: sinSocket,
      })
    : null;
  const pendientesDeAviso = [];

  copiarImagenes(uploadsDir);

  const { porNombre: categorias, creadas } = await asegurarCategorias(categoriasRepository);
  resumen.categorias = creadas;

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  const organizadores = await asegurarUsuarios(
    usuariosRepository,
    ORGANIZADORES,
    Roles.ORGANIZADOR,
    passwordHash,
  );
  const compradores = await asegurarUsuarios(
    usuariosRepository,
    COMPRADORES,
    Roles.COMPRADOR,
    passwordHash,
  );
  resumen.usuarios = organizadores.nuevos.size + compradores.nuevos.size;

  const eventos = {};
  for (const [clave, datos] of Object.entries(EVENTOS)) {
    const existente = await eventosRepository.obtenerPorNombre(datos.nombre);
    if (existente) {
      eventos[clave] = existente;
      continue;
    }

    const categoria = categorias[datos.categoria];
    const organizador = organizadores.porClave[datos.organizador];
    const imagen = CATEGORIAS.find((c) => c.nombre === datos.categoria).imagen;
    const idsTipo = Object.fromEntries(datos.tipos.map((t) => [t.id, nuevoId()]));

    const evento = new Evento({
      id: nuevoId(),
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      categoriaId: categoria.id,
      fecha: new Date(ahora.getTime() + datos.enHoras * MS_POR_HORA),
      lugar: datos.lugar,
      organizadorId: organizador.id,
      tiposEntrada: datos.tipos.map((t) => ({ ...t, id: idsTipo[t.id] })),
      multimedia: [
        {
          ruta: `/uploads/${CARPETA_IMAGENES_SEMILLA}/${imagen}.png`,
          tipo: "imagen",
          alt: ALT_IMAGENES[imagen],
        },
      ],
    });
    for (const { texto, haceHoras } of datos.ampliaciones ?? []) {
      evento.ampliarDescripcion(texto, relojEn(ahora, -haceHoras));
    }

    // Compras del evento, aplicando cada transición con el reloj en su momento.
    const compras = COMPRAS.filter((c) => c.evento === clave).map((def) => {
      const comprador = compradores.porClave[def.comprador];
      const [, creadaEn] = def.pasos[0];
      const compra = Compra.crear({
        comprador: actor(comprador),
        evento,
        tipoEntradaId: idsTipo[def.tipo],
        cantidad: def.cantidad,
        reloj: relojEn(ahora, creadaEn),
      });
      compra.id = nuevoId();
      const avisarEstado = (en) => {
        const snapshot = foto(compra);
        pendientesDeAviso.push({
          en,
          avisar: () => avisos.alCambiarEstado(snapshot, snapshot.historial.at(-1)),
        });
      };
      avisarEstado(creadaEn);
      const acciones = [
        ...def.pasos.slice(1).map(([paso, en]) => ({
          en,
          aplicar: (r) => {
            aplicarPaso(compra, evento, paso, r, comprador, organizador);
            avisarEstado(en);
          },
        })),
        ...(def.mensajes ?? []).map(([quien, texto, en]) => ({
          en,
          aplicar: (r) => {
            const autor = quien === "comprador" ? comprador : organizador;
            const destinatario = quien === "comprador" ? organizador : comprador;
            compra.agregarMensaje(actor(autor), texto, r);
            compra.registrarLectura(autor.id, r);
            pendientesDeAviso.push({
              en,
              avisar: () =>
                notificaciones.notificar(
                  TiposNotificacion.NUEVO_MENSAJE,
                  destinatario.id,
                  { autor: autor.nombreCompleto, evento: evento.nombre, extracto: texto },
                  { compraId: compra.id, eventoId: evento.id },
                ),
            });
          },
        })),
      ].sort((a, b) => a.en - b.en);
      for (const { en, aplicar } of acciones) aplicar(relojEn(ahora, en));
      return { def, compra, comprador };
    });

    if (evento.yaOcurrio(reloj)) {
      evento.finalizar(ACTOR_SISTEMA, reloj);
    }

    eventos[clave] = await eventosRepository.guardar(evento);
    resumen.eventos += 1;

    for (const { def, compra, comprador } of compras) {
      let guardada = await comprasRepository.guardar(compra);
      resumen.compras += 1;
      for (const campo of ["ultimaLecturaComprador", "ultimaLecturaOrganizador"]) {
        if (compra[campo])
          await comprasRepository.registrarLectura(compra.id, campo, compra[campo]);
      }
      if (def.resenia) {
        const resenia = await reseniasRepository.crear(
          guardada.crearResenia({
            comprador: actor(comprador),
            puntuacion: def.resenia.puntuacion,
            detalle: def.resenia.detalle,
            reloj: relojEn(ahora, def.resenia.en),
          }),
        );
        guardada.registrarResenia(resenia);
        guardada = await comprasRepository.guardar(guardada);
        organizador.registrarResenia(resenia.puntuacion);
        await usuariosRepository.guardar(organizador);
        resumen.resenias += 1;
        const snapshot = foto(guardada);
        pendientesDeAviso.push({
          en: def.resenia.en,
          avisar: () => avisos.alReseniar(snapshot, resenia),
        });
      }
    }
  }

  // Notificaciones en orden cronológico; las de hace más de 24 h quedan leídas.
  if (avisos) {
    pendientesDeAviso.sort((a, b) => a.en - b.en);
    for (const { en, avisar } of pendientesDeAviso) {
      relojAvisos.fecha = new Date(ahora.getTime() + en * MS_POR_HORA);
      const creadas = [await avisar()].flat().filter(Boolean);
      resumen.notificaciones += creadas.length;
      if (en <= -24) {
        await Promise.all(creadas.map((n) => notificacionesRepository.marcarLeida(n.id)));
      }
    }
  }

  // Favoritos: solo para compradores creados en esta corrida (no pisa cambios del usuario).
  for (const clave of compradores.nuevos) {
    const comprador = compradores.porClave[clave];
    for (const claveEvento of COMPRADORES[clave].favoritos) {
      comprador.agregarFavorito(eventos[claveEvento].id);
    }
    await usuariosRepository.guardar(comprador);
  }

  log(
    `🌱 Semilla: ${resumen.categorias} categorías, ${resumen.usuarios} usuarios, ` +
      `${resumen.eventos} eventos, ${resumen.compras} compras, ${resumen.resenias} reseñas y ` +
      `${resumen.notificaciones} notificaciones nuevas`,
  );
  return resumen;
}
