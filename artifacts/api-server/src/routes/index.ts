import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import listingsRouter from "./listings";
import conversationsRouter from "./conversations";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(listingsRouter);
router.use(conversationsRouter);
router.use(uploadRouter);

export default router;
