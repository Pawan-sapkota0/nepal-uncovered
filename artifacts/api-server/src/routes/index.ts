import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import placesRouter from "./places";
import bookmarksRouter from "./bookmarks";
import reviewsRouter from "./reviews";
import reportsRouter from "./reports";
import filterPresetsRouter from "./filterPresets";
import adminRouter from "./admin";
import storageRouter from "./storage";
import meRouter from "./me";
import tripsRouter from "./trips";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(placesRouter);
router.use(bookmarksRouter);
router.use(reviewsRouter);
router.use(reportsRouter);
router.use(filterPresetsRouter);
router.use("/admin", adminRouter);
router.use(storageRouter);
router.use(meRouter);
router.use(tripsRouter);

export default router;
