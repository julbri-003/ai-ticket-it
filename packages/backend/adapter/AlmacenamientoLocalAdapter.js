import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const EXTENSIONES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
};

/**
 * Almacenamiento de archivos en disco, dentro de UPLOADS_DIR/eventos con nombre UUID.
 * Interfaz (la que conoce el service): guardar(archivo) → ruta pública, eliminar(ruta).
 * Para cambiar de proveedor (S3, Cloudinary...) basta otro adapter con la misma interfaz.
 *
 * Solo borra lo que guardó él mismo (/uploads/eventos/...): las imágenes de la semilla
 * (/uploads/semilla/...) son compartidas entre eventos y nunca se eliminan.
 */
export class AlmacenamientoLocalAdapter {
  constructor({ directorio = process.env.UPLOADS_DIR || "uploads", carpeta = "eventos" } = {}) {
    this.directorio = directorio;
    this.carpeta = carpeta;
    this.prefijo = `/uploads/${carpeta}/`;
  }

  /** @param archivo { buffer, mimetype } → "/uploads/eventos/<uuid>.<ext>" */
  async guardar(archivo) {
    const nombre = `${randomUUID()}${EXTENSIONES[archivo.mimetype] ?? ""}`;
    const destino = path.join(this.directorio, this.carpeta);
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, nombre), archivo.buffer);
    return `${this.prefijo}${nombre}`;
  }

  async eliminar(ruta) {
    if (typeof ruta !== "string" || !ruta.startsWith(this.prefijo)) return false;
    const nombre = path.basename(ruta);
    try {
      await fs.unlink(path.join(this.directorio, this.carpeta, nombre));
      return true;
    } catch {
      return false; // Ya no estaba: eliminar es idempotente.
    }
  }
}
