/**
 * Ejecuta tareas periódicas: al iniciar y cada `intervaloMs`. Cada tarea es { nombre, ejecutar }
 * y devuelve cuántos cambios aplicó. El programador solo orquesta: la lógica vive en los services.
 * Si una tarea falla se registra y siguen las demás. No se solapan dos corridas.
 */
export class ProgramadorTareas {
  constructor({ tareas, reloj, intervaloMs = 60000, log = console }) {
    this.tareas = tareas;
    this.reloj = reloj;
    this.intervaloMs = intervaloMs;
    this.log = log;
    this.temporizador = null;
    this.enCurso = null;
  }

  /** Corre todas las tareas en orden. Devuelve { [nombre]: cambios | "error" }. */
  async ejecutarTodas() {
    if (this.enCurso) return this.enCurso;
    this.enCurso = (async () => {
      const resultados = {};
      for (const { nombre, ejecutar } of this.tareas) {
        try {
          resultados[nombre] = await ejecutar();
        } catch (error) {
          resultados[nombre] = "error";
          this.log.error?.(`⏱️  La tarea ${nombre} falló: ${error.message}`);
        }
      }
      const cambios = Object.entries(resultados).filter(([, n]) => n);
      if (cambios.length > 0) {
        this.log.log?.(
          `⏱️  ${this.reloj.ahora().toISOString()} tareas: ${cambios.map(([n, c]) => `${n}=${c}`).join(", ")}`,
        );
      }
      return resultados;
    })();
    try {
      return await this.enCurso;
    } finally {
      this.enCurso = null;
    }
  }

  /** Ejecuta ya y después cada intervaloMs. No hace nada con NODE_ENV=test. */
  iniciar() {
    if (process.env.NODE_ENV === "test" || this.temporizador) return false;
    this.ejecutarTodas();
    this.temporizador = setInterval(() => this.ejecutarTodas(), this.intervaloMs);
    this.temporizador.unref?.();
    return true;
  }

  detener() {
    clearInterval(this.temporizador);
    this.temporizador = null;
  }
}
