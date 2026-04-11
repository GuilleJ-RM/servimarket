import { Router, type IRouter } from "express";
import { UploadImageBody } from "@workspace/api-zod";
import rateLimit from "express-rate-limit";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Demasiadas subidas, intente más tarde" } });

router.post("/upload/image", uploadLimiter, async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const parsed = UploadImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { base64, filename } = parsed.data;
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"]);
  if (!ALLOWED_EXTS.has(ext)) {
    res.status(400).json({ error: "Tipo de archivo no permitido" });
    return;
  }
  const name = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);

  const buffer = Buffer.from(base64, "base64");

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (buffer.length > MAX_FILE_SIZE) {
    res.status(400).json({ error: "El archivo no puede superar 10MB" });
    return;
  }

  // Validate magic bytes match declared extension
  const MAGIC_BYTES: Record<string, number[][]> = {
    ".jpg": [[0xFF, 0xD8, 0xFF]],
    ".jpeg": [[0xFF, 0xD8, 0xFF]],
    ".png": [[0x89, 0x50, 0x4E, 0x47]],
    ".gif": [[0x47, 0x49, 0x46, 0x38]],
    ".webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (also check bytes 8-11)
    ".pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  };
  const expectedSigs = MAGIC_BYTES[ext];
  if (expectedSigs) {
    const matches = expectedSigs.some(sig => sig.every((byte, i) => buffer[i] === byte));
    // WebP: additionally verify bytes 8-11 spell "WEBP"
    if (ext === ".webp" && matches) {
      const webpSig = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      if (!webpSig.every((byte, i) => buffer[8 + i] === byte)) {
        res.status(400).json({ error: "El contenido del archivo no coincide con la extensión" });
        return;
      }
    }
    if (!matches) {
      res.status(400).json({ error: "El contenido del archivo no coincide con la extensi\u00f3n" });
      return;
    }
  }

  try {
    fs.writeFileSync(filePath, buffer);
  } catch {
    res.status(500).json({ error: "Error al guardar el archivo" });
    return;
  }

  const url = `/api/uploads/${name}`;
  res.json({ url });
});

router.get("/uploads/:filename", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const safeName = path.basename(raw);
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    res.status(404).json({ error: "Archivo no encontrado" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
