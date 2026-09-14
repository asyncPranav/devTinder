import { Router } from "express";

// middlewares
import validate from "../middlewares/validate.middleware.js";
import authenticate from "../middlewares/authenticate.middleware.js";

// validators
import {
  registerValidator,
  loginValidator,
} from "../validators/auth.validator.js";

// controllers
import {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  logoutAll,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", registerValidator, validate, register);
authRouter.post("/login", loginValidator, validate, login);
authRouter.get("/me", authenticate, getMe);
authRouter.post("/refresh", authenticate, refreshToken);
authRouter.post("/logout", authenticate, logout);
authRouter.post("/logout-all", authenticate, logoutAll);

export default authRouter;
