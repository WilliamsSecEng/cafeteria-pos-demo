import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import categoriesRoutes from "./categories.routes.js";
import productsRoutes from "./products.routes.js";
import salesRoutes from "./sales.routes.js";
import cashRoutes from "./cash.routes.js";
import reportsRoutes from "./reports.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/sales", salesRoutes);
router.use("/cash", cashRoutes);
router.use("/reports", reportsRoutes);

export default router;