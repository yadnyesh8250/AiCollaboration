import { Router } from "express";
import { deleteAttachment } from "../controllers/attachment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.delete("/:id", deleteAttachment);

export default router;
