import { Router, type IRouter } from "express";
import { UploadImageBody } from "@workspace/api-zod";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

router.post("/upload/image", async (req, res): Promise<void> => {
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
  const ext = path.extname(filename) || ".jpg";
  const name = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);

  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(filePath, buffer);

  const url = `/api/uploads/${name}`;
  res.json({ url });
});

router.get("/uploads/:filename", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filePath = path.join(UPLOAD_DIR, raw);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Archivo no encontrado" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
