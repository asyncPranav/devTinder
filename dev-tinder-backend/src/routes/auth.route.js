import { Router } from "express";

// middlewares
import validate from "../middlewares/validate.middleware.js";
import authenticate from "../middlewares/auth.middleware.js";

// validators
import { registerValidator, loginValidator } from "../validators/auth.validator.js";

// controllers
import { register, login, getMe, refreshToken } from "../controllers/auth.controller.js";


const authRouter = Router();

authRouter.post("/register", registerValidator, validate, register);
authRouter.post("/login", loginValidator, validate, login);
authRouter.get("/me", authenticate, getMe);
authRouter.post("/refresh", authenticate, refreshToken);




export default authRouter;