import { Router } from "express";

import authenticate from "../middlewares/authenticate.middleware.js";
import validate from "../middlewares/validate.middleware.js";

import {
  sendRequestValidator,
  reviewRequestValidator,
} from "../validators/request.validator.js";

import {
  sendRequest,
  reviewRequest,
} from "../controllers/request.controller.js";

const requestRouter = Router();

// POST /request/send/:status/:toUserId
requestRouter.post(
  "/send/:status/:toUserId",
  authenticate,
  sendRequestValidator,
  validate,
  sendRequest,
);

// POST /request/review/:status/:requestId
requestRouter.post(
  "/review/:status/:requestId",
  authenticate,
  reviewRequestValidator,
  validate,
  reviewRequest,
);

export default requestRouter;
