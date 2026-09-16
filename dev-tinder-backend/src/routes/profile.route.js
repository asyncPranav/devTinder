import { Router } from "express";

import authenticate from "../middlewares/authenticate.middleware.js";
import validate from "../middlewares/validate.middleware.js";

import {
  profileValidator,
  changePasswordValidator,
} from "../validators/profile.validator.js";

import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/profile.controller.js";

const profileRouter = Router();

profileRouter.get("/view", authenticate, getProfile);
profileRouter.patch("/edit", authenticate, profileValidator, validate, updateProfile);
profileRouter.patch("/change-password", authenticate, changePasswordValidator, validate, changePassword);

export default profileRouter;
