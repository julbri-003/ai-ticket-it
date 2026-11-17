import multer from "multer";
import { BadRequestError } from "../errors/AppError.js";

const MB = 1024 * 1024;

export const TIPOS_PERMITIDOS = {
  "image/jpeg": "imagen",
  "image/png": "imagen",
  "image/webp": "imagen",
  "video/mp4": "video",
};

export const LIMITES_UPLOAD = {
  imagen: 5 * MB,
  video: 20 * MB,
  archivos: 6,
};

/**
 * Multer en memoria: el service recibe { buffer, mimetype, originalname, size } y lo guarda a
 * través del adapter de almacenamiento (no conoce multer ni fs).
 * El límite global de tamaño es el de video; el de imagen se valida después, por tipo.
 */
const subir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITES_UPLOAD.video, files: LIMITES_UPLOAD.archivos, fields: 20 },
  fileFilter(req, archivo, cb) {
    if (!TIPOS_PERMITIDOS[archivo.mimetype]) {
      return cb(
        new BadRequestError(
          `Tipo de archivo no permitido (${archivo.mimetype}). Se aceptan imágenes JPG, PNG o WEBP y videos MP4`,
        ),
      );
    }
    cb(null, true);
  },
}).array("archivos", LIMITES_UPLOAD.archivos);

/** Recibe hasta 6 archivos en el campo "archivos" y valida el tamaño según el tipo. */
export function uploadMultimedia(req, res, next) {
  subir(req, res, (error) => {
    if (error) return next(error);
    const archivos = req.files ?? [];
    if (archivos.length === 0) {
      return next(new BadRequestError('Debés adjuntar al menos un archivo en el campo "archivos"'));
    }
    const imagenGrande = archivos.find(
      (a) => TIPOS_PERMITIDOS[a.mimetype] === "imagen" && a.size > LIMITES_UPLOAD.imagen,
    );
    if (imagenGrande) {
      return next(
        new BadRequestError(
          `La imagen "${imagenGrande.originalname}" supera el máximo de ${LIMITES_UPLOAD.imagen / MB} MB`,
        ),
      );
    }
    next();
  });
}
