import { Router } from "express";
import { globalSearch } from "./search.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/", globalSearch);

export default router;
