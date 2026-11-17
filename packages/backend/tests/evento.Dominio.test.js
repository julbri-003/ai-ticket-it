import { Evento } from "../domain/eventoDominio.js";
import { TipoEntrada } from "../domain/tipoEntradaDominio.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors/AppError.js";
import {
  AHORA,
  DIA,
  HORA,
  crearEvento,
  datosEvento,
  relojFijo,
  sistemaUsuario,
} from "./helpers/fabricasDominio.js";

describe("Dominio Evento", () => {
  describe("creación", () => {
    test("crea un evento válido con instancias de TipoEntrada", () => {
      const evento = Evento.crear(datosEvento(), relojFijo());
      expect(evento.tiposEntrada[0]).toBeInstanceOf(TipoEntrada);
      expect(evento.activo).toBe(true);
      expect(evento.ampliacionesDescripcion).toEqual([]);
    });

    test.each([
      [{ nombre: "" }, "nombre"],
      [{ descripcion: undefined }, "descripción"],
      [{ categoriaId: null }, "categoría"],
      [{ lugar: " " }, "lugar"],
      [{ fecha: "no-es-fecha" }, "fecha"],
      [{ organizadorId: undefined }, "organizador"],
      [{ tiposEntrada: [] }, "al menos un tipo"],
      [{ tiposEntrada: undefined }, "al menos un tipo"],
    ])("rechaza %p", (extra, mensaje) => {
      expect(() => Evento.crear(datosEvento(extra), relojFijo())).toThrow(mensaje);
    });

    test("rechaza nombres de tipo de entrada repetidos (sin importar mayúsculas)", () => {
      const tiposEntrada = [
        { nombre: "General", precio: 10, cupo: 1 },
        { nombre: " general ", precio: 20, cupo: 1 },
      ];
      expect(() => Evento.crear(datosEvento({ tiposEntrada }), relojFijo())).toThrow(
        "Ya existe un tipo de entrada",
      );
    });

    test("Evento.crear exige fecha futura; el constructor permite hidratar eventos pasados", () => {
      const pasado = datosEvento({ fecha: new Date(AHORA.getTime() - DIA) });
      expect(() => Evento.crear(pasado, relojFijo())).toThrow("futura");
      expect(() => Evento.crear(datosEvento({ fecha: AHORA }), relojFijo())).toThrow("futura");
      expect(new Evento(pasado).yaOcurrio(relojFijo())).toBe(true);
    });

    test("las imágenes requieren texto alternativo; los videos no", () => {
      expect(() =>
        crearEvento({ multimedia: [{ ruta: "a.jpg", tipo: "imagen", alt: "" }] }),
      ).toThrow("texto alternativo");
      const evento = crearEvento({ multimedia: [{ ruta: "a.mp4", tipo: "video" }] });
      expect(evento.multimedia).toEqual([{ ruta: "a.mp4", tipo: "video", alt: "" }]);
    });

    test("rechaza multimedia de tipo desconocido o sin ruta", () => {
      expect(() => crearEvento({ multimedia: [{ ruta: "a.pdf", tipo: "pdf" }] })).toThrow("imagen");
      expect(() => crearEvento({ multimedia: [{ tipo: "video" }] })).toThrow("ruta");
    });
  });

  test("yaOcurrio es true desde el instante exacto del evento", () => {
    const evento = crearEvento({ fecha: new Date(AHORA.getTime() + HORA) });
    const reloj = relojFijo();
    expect(evento.yaOcurrio(reloj)).toBe(false);
    reloj.avanzar(HORA - 1);
    expect(evento.yaOcurrio(reloj)).toBe(false);
    reloj.avanzar(1);
    expect(evento.yaOcurrio(reloj)).toBe(true);
  });

  describe("precios", () => {
    const evento = crearEvento(); // General 15000, VIP 45000

    test("precioMinimo", () => {
      expect(evento.precioMinimo).toBe(15000);
    });

    test.each([
      [10000, 20000, true],
      [20000, 40000, false],
      [45000, 45000, false],
      [15000, 15000, true],
      [null, 14999, false],
      [null, 15000, true],
      [45001, undefined, false],
      [40000, undefined, false],
      [undefined, undefined, true],
    ])("tuPrecioEstaEntre(%p, %p) = %p (sobre el precio mínimo)", (min, max, esperado) => {
      expect(evento.tuPrecioEstaEntre(min, max)).toBe(esperado);
    });
  });

  test("imagenPrincipal devuelve la primera imagen o null", () => {
    expect(crearEvento().imagenPrincipal.ruta).toBe("uploads/afiche.jpg");
    expect(crearEvento({ multimedia: [] }).imagenPrincipal).toBeNull();
  });

  test("buscarTipoEntrada encuentra por id o lanza NotFoundError", () => {
    const evento = crearEvento();
    expect(evento.buscarTipoEntrada("tipo-vip").nombre).toBe("VIP");
    expect(() => evento.buscarTipoEntrada("no-existe")).toThrow(NotFoundError);
  });

  describe("edición restringida", () => {
    let evento;
    let reloj;
    beforeEach(() => {
      evento = crearEvento();
      reloj = relojFijo();
    });

    test("agrega y quita multimedia", () => {
      evento.agregarMultimedia([{ ruta: "uploads/b.mp4", tipo: "video" }], reloj);
      evento.quitarMultimedia("uploads/afiche.jpg", reloj);
      expect(evento.multimedia.map((m) => m.ruta)).toEqual(["uploads/b.mp4"]);
    });

    test("quitar multimedia inexistente lanza NotFoundError", () => {
      expect(() => evento.quitarMultimedia("nada.jpg", reloj)).toThrow(NotFoundError);
    });

    test("agrega un tipo de entrada nuevo sin tocar los existentes", () => {
      evento.agregarTipoEntrada({ nombre: "Platea", precio: 30000, cupo: 20 }, reloj);
      expect(evento.tiposEntrada.map((t) => t.nombre)).toEqual(["General", "VIP", "Platea"]);
      expect(evento.tiposEntrada[2]).toBeInstanceOf(TipoEntrada);
    });

    test("no permite agregar un tipo con nombre repetido", () => {
      expect(() => evento.agregarTipoEntrada({ nombre: "vip", precio: 1, cupo: 1 }, reloj)).toThrow(
        BadRequestError,
      );
      expect(evento.tiposEntrada).toHaveLength(2);
    });

    test("ampliarDescripcion agrega una ampliación con fecha y no toca la original", () => {
      evento.ampliarDescripcion("  Se suma un invitado  ", reloj);
      expect(evento.descripcion).toBe("Una noche de jazz en vivo");
      expect(evento.ampliacionesDescripcion).toEqual([
        { texto: "Se suma un invitado", fecha: AHORA },
      ]);
    });

    test("rechaza una ampliación vacía o demasiado larga", () => {
      expect(() => evento.ampliarDescripcion("  ", reloj)).toThrow(BadRequestError);
      expect(() => evento.ampliarDescripcion("x".repeat(2001), reloj)).toThrow("máximo");
    });

    test("editar aplica varios cambios permitidos a la vez", () => {
      evento.editar(
        {
          multimediaNueva: [{ ruta: "b.jpg", tipo: "imagen", alt: "Escenario" }],
          tiposEntradaNuevos: [{ nombre: "Campo", precio: 5000, cupo: 50 }],
          ampliacionDescripcion: "Puertas 20 h",
        },
        reloj,
      );
      expect(evento.multimedia).toHaveLength(2);
      expect(evento.tiposEntrada).toHaveLength(3);
      expect(evento.ampliacionesDescripcion).toHaveLength(1);
    });

    test("editar es atómico: si un cambio es inválido no aplica ninguno", () => {
      expect(() =>
        evento.editar(
          {
            multimediaNueva: [{ ruta: "b.jpg", tipo: "imagen", alt: "Escenario" }],
            tiposEntradaNuevos: [{ nombre: "General", precio: 1, cupo: 1 }],
          },
          reloj,
        ),
      ).toThrow(BadRequestError);
      expect(evento.multimedia).toHaveLength(1);
      expect(evento.tiposEntrada).toHaveLength(2);
    });

    test.each([
      ["nombre", "Otro nombre", "no se puede modificar"],
      ["fecha", new Date(), "no se puede modificar"],
      ["lugar", "Otro lugar", "no se puede modificar"],
      ["categoriaId", "otra", "no se puede modificar"],
      ["organizadorId", "otro", "no se puede modificar"],
      ["descripcion", "Nueva", "agregá una ampliación"],
      ["tiposEntrada", [], "solo se pueden agregar nuevos"],
      ["multimedia", [], "multimediaNueva"],
    ])("editar el campo %s lanza BadRequestError", (campo, valor, mensaje) => {
      const intento = () => evento.editar({ [campo]: valor }, reloj);
      expect(intento).toThrow(BadRequestError);
      expect(intento).toThrow(mensaje);
    });

    test("editar sin cambios lanza BadRequestError", () => {
      expect(() => evento.editar({}, reloj)).toThrow("No hay cambios");
      expect(() => evento.editar(null, reloj)).toThrow("No hay cambios");
    });

    test("no se puede editar un evento que ya ocurrió", () => {
      reloj.avanzar(11 * DIA);
      expect(() => evento.ampliarDescripcion("Tarde", reloj)).toThrow(ConflictError);
      expect(() => evento.agregarMultimedia([], reloj)).toThrow("ya ocurrió");
    });

    test("no se puede editar un evento finalizado", () => {
      evento.activo = false;
      expect(() => evento.ampliarDescripcion("x", reloj)).toThrow("finalizado");
    });
  });

  describe("finalizar", () => {
    test("da de baja el evento que ya ocurrió y registra la auditoría con el reloj", () => {
      const evento = crearEvento();
      const reloj = relojFijo(new Date(AHORA.getTime() + 11 * DIA));
      evento.finalizar(sistemaUsuario, reloj);
      expect(evento.activo).toBe(false);
      expect(evento.modificadoPor).toBe("SISTEMA");
      expect(evento.fechaModificacion).toEqual(reloj.ahora());
    });

    test("no finaliza un evento futuro", () => {
      expect(() => crearEvento().finalizar(sistemaUsuario, relojFijo())).toThrow(ConflictError);
    });
  });
});
