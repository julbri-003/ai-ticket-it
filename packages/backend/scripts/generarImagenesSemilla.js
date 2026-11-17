// Genera los afiches de relleno de seeds/assets/ (PNG 1200×675, 16:9) sin dependencias externas.
// Son composiciones abstractas con la paleta "Telón de terciopelo", una por categoría. Se pueden
// reemplazar por fotos reales manteniendo el mismo nombre de archivo.
//
//   node scripts/generarImagenesSemilla.js
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ANCHO = 1200;
const ALTO = 675;
const destino = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "seeds", "assets");

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const P = {
  // Paleta "Telón de terciopelo" (specs/00-contexto-comun.md).
  marfil: hex("#faf7f2"),
  crema: hex("#f5efe6"),
  platea: hex("#0f0b0d"),
  plateaCard: hex("#1d1417"),
  plateaElevada: hex("#2a1a1f"),
  bordo: hex("#7a1e2c"),
  rojo: hex("#c8102e"),
  rojoTalon: hex("#b3122c"),
  dorado: hex("#d4af37"),
  oro: hex("#b8892b"),
  azul: hex("#1f3a5f"),
  azulClaro: hex("#8fb3de"),
  verde: hex("#1f6b52"),
};

// Cada afiche: fondo (degradé), figura principal y acento.
const AFICHES = {
  recitales: { fondo: [P.bordo, P.platea], figura: "ondas", color: P.dorado, acento: P.crema },
  teatro: {
    fondo: [P.platea, P.plateaElevada],
    figura: "telon",
    color: P.rojoTalon,
    acento: P.dorado,
  },
  "stand-up": {
    fondo: [P.plateaElevada, P.platea],
    figura: "foco",
    color: P.crema,
    acento: P.rojo,
  },
  festivales: {
    fondo: [P.bordo, P.plateaCard],
    figura: "banderines",
    color: P.dorado,
    acento: P.crema,
  },
  deportes: { fondo: [P.azul, P.platea], figura: "cancha", color: P.crema, acento: P.dorado },
  conferencias: {
    fondo: [P.plateaCard, P.platea],
    figura: "atril",
    color: P.crema,
    acento: P.bordo,
  },
  infantiles: { fondo: [P.marfil, P.crema], figura: "globos", color: P.rojo, acento: P.azul },
  danza: { fondo: [P.platea, P.bordo], figura: "espiral", color: P.dorado, acento: P.crema },
};

function mezclar(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function crearLienzo({ fondo }) {
  const px = new Uint8Array(ANCHO * ALTO * 3);
  for (let y = 0; y < ALTO; y++) {
    const c = mezclar(fondo[0], fondo[1], y / ALTO);
    for (let x = 0; x < ANCHO; x++) {
      // Sin grano: con ruido el PNG no comprime (450 KB por afiche).
      const grano = 0;
      const i = (y * ANCHO + x) * 3;
      px[i] = Math.max(0, Math.min(255, c[0] + grano));
      px[i + 1] = Math.max(0, Math.min(255, c[1] + grano));
      px[i + 2] = Math.max(0, Math.min(255, c[2] + grano));
    }
  }
  const pintar = (x, y, color) => {
    if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return;
    const i = (Math.floor(y) * ANCHO + Math.floor(x)) * 3;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
  };
  const rect = (x0, y0, x1, y1, color) => {
    for (let y = Math.max(0, y0); y < Math.min(ALTO, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(ANCHO, x1); x++) pintar(x, y, color);
  };
  const circulo = (cx, cy, r, color, grosor = null) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r && (grosor == null || d >= r - grosor)) pintar(x, y, color);
      }
  };
  const triangulo = (ax, ay, bx, by, cx, cy, color) => {
    const minX = Math.min(ax, bx, cx);
    const maxX = Math.max(ax, bx, cx);
    const minY = Math.min(ay, by, cy);
    const maxY = Math.max(ay, by, cy);
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / area;
        const w1 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / area;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) pintar(x, y, color);
      }
  };
  return { px, pintar, rect, circulo, triangulo };
}

function dibujarFigura(l, { figura, color, acento }) {
  const cx = ANCHO / 2;
  const cy = ALTO / 2;
  switch (figura) {
    case "ondas":
      for (let k = 0; k < 6; k++) l.circulo(cx, cy + 40, 60 + k * 45, k % 2 ? acento : color, 14);
      break;
    case "telon":
      for (let k = 0; k < 10; k++) l.rect(k * 60, 0, k * 60 + 40, ALTO - 120 + (k % 2) * 30, color);
      for (let k = 0; k < 10; k++)
        l.rect(ANCHO - k * 60 - 40, 0, ANCHO - k * 60, ALTO - 120 + (k % 2) * 30, color);
      l.circulo(cx, cy, 70, acento);
      break;
    case "foco":
      l.triangulo(cx, 40, cx - 260, ALTO, cx + 260, ALTO, mezclar(color, acento, 0.15));
      l.rect(cx - 12, cy - 30, cx + 12, ALTO - 120, acento);
      l.circulo(cx, cy - 60, 46, acento);
      break;
    case "banderines":
      for (let k = 0; k < 12; k++) {
        const x = 40 + k * 95;
        l.triangulo(x, 120, x + 80, 120, x + 40, 220, k % 2 ? acento : color);
      }
      l.circulo(cx, cy + 120, 110, color);
      break;
    case "cancha":
      l.rect(160, 120, ANCHO - 160, 128, color);
      l.rect(160, ALTO - 128, ANCHO - 160, ALTO - 120, color);
      l.rect(160, 120, 168, ALTO - 120, color);
      l.rect(ANCHO - 168, 120, ANCHO - 160, ALTO - 120, color);
      l.rect(cx - 4, 120, cx + 4, ALTO - 120, color);
      l.circulo(cx, cy, 90, color, 8);
      l.circulo(cx + 200, cy - 60, 26, acento);
      break;
    case "atril":
      l.rect(cx - 140, cy - 20, cx + 140, cy + 10, color);
      l.triangulo(cx - 120, cy + 10, cx + 120, cy + 10, cx, ALTO - 80, color);
      l.circulo(cx, cy - 120, 60, acento);
      break;
    case "globos":
      [
        [cx - 220, cy - 60, color],
        [cx, cy - 120, acento],
        [cx + 220, cy - 40, color],
      ].forEach(([x, y, c]) => {
        l.circulo(x, y, 90, c);
        l.rect(x - 2, y + 90, x + 2, ALTO - 60, P.platea);
      });
      break;
    case "espiral":
      for (let t = 0; t < 40; t += 0.01) {
        const r = 10 + t * 7;
        l.circulo(cx + r * Math.cos(t), cy + r * Math.sin(t), 7, t % 4 < 2 ? color : acento);
      }
      break;
  }
  // Filete punteado dorado (talón de la entrada).
  for (let x = 20; x < ANCHO - 20; x += 28) l.rect(x, ALTO - 48, x + 14, ALTO - 44, P.oro);
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function bloque(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

function aPng(px) {
  const filas = Buffer.alloc((ANCHO * 3 + 1) * ALTO);
  for (let y = 0; y < ALTO; y++) {
    filas[y * (ANCHO * 3 + 1)] = 0;
    Buffer.from(px.buffer, y * ANCHO * 3, ANCHO * 3).copy(filas, y * (ANCHO * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ANCHO, 0);
  ihdr.writeUInt32BE(ALTO, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque("IHDR", ihdr),
    bloque("IDAT", zlib.deflateSync(filas, { level: 9 })),
    bloque("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(destino, { recursive: true });
for (const [nombre, afiche] of Object.entries(AFICHES)) {
  const lienzo = crearLienzo(afiche);
  dibujarFigura(lienzo, afiche);
  const archivo = path.join(destino, `${nombre}.png`);
  fs.writeFileSync(archivo, aPng(lienzo.px));
  console.log(`✓ ${path.relative(process.cwd(), archivo)}`);
}
