import { Router } from "express";
import { getDb } from "../db/client.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { riskAssessSchema } from "../schemas.js";
import { assessRisk } from "../services/riskEngine.js";

const router = Router();
router.use(authMiddleware);

router.post("/assess", validateBody(riskAssessSchema), (req, res) => {
  const result = assessRisk(req.body);
  res.json(result);
});

export default router;
