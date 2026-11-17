// Composition root: único lugar donde se instancian repositorios, services y adapters.
// Sin modo mock (a diferencia de REPO_REF): la base en memoria cumple ese rol.
import { reloj } from "./utils/reloj.js";
import { UsuariosMongoRepository } from "./repositories/mongo/UsuariosMongoRepository.js";
import { CategoriasMongoRepository } from "./repositories/mongo/CategoriasMongoRepository.js";
import { EventosMongoRepository } from "./repositories/mongo/EventosMongoRepository.js";
import { ComprasMongoRepository } from "./repositories/mongo/ComprasMongoRepository.js";
import { ReseniasMongoRepository } from "./repositories/mongo/ReseniasMongoRepository.js";
import { NotificacionesMongoRepository } from "./repositories/mongo/NotificacionesMongoRepository.js";
import { AlmacenamientoLocalAdapter } from "./adapter/AlmacenamientoLocalAdapter.js";
import { AuthService } from "./services/AuthService.js";
import { CategoriasService } from "./services/CategoriasService.js";
import { ComprasService } from "./services/ComprasService.js";
import { ProgramadorTareas } from "./jobs/ProgramadorTareas.js";
import { EventosService } from "./services/EventosService.js";
import { FavoritosService } from "./services/FavoritosService.js";
import { RecomendacionesService } from "./services/RecomendacionesService.js";
import { ReseniasService } from "./services/ReseniasService.js";
import { VistasEventos } from "./services/VistasEventos.js";

export { reloj };

export const usuariosRepository = new UsuariosMongoRepository();
export const categoriasRepository = new CategoriasMongoRepository();
export const eventosRepository = new EventosMongoRepository({ reloj });
export const comprasRepository = new ComprasMongoRepository();
export const reseniasRepository = new ReseniasMongoRepository();
export const notificacionesRepository = new NotificacionesMongoRepository();

/** Repositorios que necesita la siembra de datos de demo. */
export const repositoriosSemilla = {
  usuariosRepository,
  categoriasRepository,
  eventosRepository,
  comprasRepository,
  reseniasRepository,
};

// ----- Adapters -----
export const almacenamiento = new AlmacenamientoLocalAdapter();

// ----- Services -----
export const vistasEventos = new VistasEventos({ categoriasRepository, usuariosRepository });
export const authService = new AuthService({ usuariosRepository });
export const categoriasService = new CategoriasService({ categoriasRepository });
export const recomendacionesService = new RecomendacionesService({
  usuariosRepository,
  eventosRepository,
  comprasRepository,
  categoriasRepository,
  vistasEventos,
});
export const eventosService = new EventosService({
  eventosRepository,
  categoriasRepository,
  comprasRepository,
  almacenamiento,
  recomendacionesService,
  vistasEventos,
  reloj,
});
export const favoritosService = new FavoritosService({
  usuariosRepository,
  eventosRepository,
  vistasEventos,
});
export const reseniasService = new ReseniasService({
  reseniasRepository,
  eventosRepository,
  usuariosRepository,
});
export const comprasService = new ComprasService({
  comprasRepository,
  eventosRepository,
  usuariosRepository,
  reseniasRepository,
  reloj,
});

// ----- Tareas programadas (transiciones automáticas) -----
export const programadorTareas = new ProgramadorTareas({
  reloj,
  intervaloMs: Number(process.env.INTERVALO_JOBS_MS) || 60000,
  tareas: [
    { nombre: "vencerComprasPendientes", ejecutar: () => comprasService.vencerComprasPendientes() },
    { nombre: "marcarComprasUtilizadas", ejecutar: () => comprasService.marcarComprasUtilizadas() },
    { nombre: "reembolsosAutomaticos", ejecutar: () => comprasService.reembolsosAutomaticos() },
    { nombre: "finalizarEventosPasados", ejecutar: () => eventosService.finalizarEventosPasados() },
  ],
});
