import { param } from "express-validator";
import mongoose from "mongoose";

// Shared helper: is this a syntactically valid Mongo ObjectId?
// Used for both :toUserId (send) and :requestId (review).
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// POST /request/send/:status/:toUserId
// The SENDER chooses "interested" (wants to connect) or "ignored" (passes).
// Deliberately its own array, not shared with reviewValidator -- the two
// endpoints allow DIFFERENT status values, and merging them would let
// /send accept "accepted"/"rejected" or /review accept "interested"/"ignored",
// which breaks the state machine the model comments describe.
const sendRequestValidator = [
  param("status")
    .isIn(["interested", "ignored"])
    .withMessage('status must be "interested" or "ignored"'),

  param("toUserId")
    .custom(isValidObjectId)
    .withMessage("toUserId must be a valid user id"),
];

// POST /request/review/:status/:requestId
// The RECIPIENT reviews a still-"interested" request and sets it to
// "accepted" or "rejected". Whether the request is actually still
// "interested" (not already reviewed) is a business-logic check in the
// controller, not something this validator can know.
const reviewRequestValidator = [
  param("status")
    .isIn(["accepted", "rejected"])
    .withMessage('status must be "accepted" or "rejected"'),

  param("requestId")
    .custom(isValidObjectId)
    .withMessage("requestId must be a valid request id"),
];

export { sendRequestValidator, reviewRequestValidator };
