import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

// Instancia o controlador
const authController = new AuthController();

const authRouter = Router();

// * Important Os caminho serão '/auth/...' por causa do prefixo no index.ts

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.get("/me", authMiddleware, authController.getMe);

export { authRouter };
