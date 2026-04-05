import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.id);
  res.json(categories.map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    description: c.description,
  })));
});

export default router;
