import { Router } from "express";

// middlewares
import validate from "../middlewares/validate.middleware.js";


// validators
import { registerValidator, loginValidator } from "../validators/auth.validator.js";

// controllers
import { register, login } from "../controllers/auth.controller.js";


const authRouter = Router();

authRouter.post("/register", registerValidator, validate, register);
authRouter.post("/login", loginValidator, validate, login);




export default authRouter;