import mongoose from "mongoose";

import ApiError from "../utils/ApiError.util.js";

/**
 * ConnectionRequest
 * ------------------
 * Represents a directed relationship-request between two users.
 *
 * Lifecycle:
 *   1. fromUserId sends a request to toUserId with status "interested" or "ignored"
 *      (POST /request/send/:status/:toUserId)
 *   2. toUserId reviews a still-"interested" request and sets it to
 *      "accepted" or "rejected" (POST /request/review/:status/:requestId)
 *
 * Design decision: "interested" and "accepted" are ACTIVE states — only
 * one active document may exist between any two users, in either
 * direction, at a time. "rejected" and "ignored" are TERMINAL-but-not-
 * permanent states: once a request settles there, the sender is free to
 * send a new request to the same person later, which creates a NEW
 * document (old ones are kept as history, not deleted or overwritten).
 * See the partial unique index below for how this is enforced at the DB
 * layer, and the controller for how it's enforced at the app layer.
 */
const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "fromUserId is required"],
    },

    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "toUserId is required"],
    },

    // "interested" / "ignored"  -> set by fromUserId when the request is sent.
    // "accepted"   / "rejected" -> set by toUserId when reviewing an "interested" request.
    // The controller layer is responsible for only allowing the right
    // transitions (e.g. you can only review a request that is currently
    // "interested" -- the schema itself doesn't enforce state-transition
    // rules, only "is this one of the four valid values").
    status: {
      type: String,
      enum: {
        values: ["interested", "ignored", "accepted", "rejected"],
        message: "{VALUE} is not a valid connection request status",
      },
      required: [true, "status is required"],
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Compound unique index on (fromUserId, toUserId) -- PARTIAL.
 *
 * Product rule: "interested" and "accepted" are the only ACTIVE / blocking
 * states. Once a request settles into "rejected" or "ignored", the sender
 * is allowed to send a brand-new request to the same person later. So a
 * given (fromUserId, toUserId) pair CAN have more than one document over
 * time -- just never more than one ACTIVE one at once.
 *
 * partialFilterExpression restricts the unique constraint to only apply
 * when status is "interested" or "accepted". A document with status
 * "rejected" or "ignored" is invisible to this index, so a fresh document
 * for the same ordered pair can be inserted without a duplicate-key error.
 *
 * IMPORTANT -- what this index does and does NOT do:
 *   - It DOES prevent a second ACTIVE ("interested"/"accepted") document
 *     for the exact same ordered pair (fromUserId -> toUserId).
 *   - It does NOT prevent the reverse direction (B sending to A while
 *     A -> B is active) -- {A,B} and {B,A} are different index keys.
 *
 * Because our business rule is "no ACTIVE relationship in either
 * direction," the REAL enforcement of that rule happens in the controller
 * via an app-level query that checks both {fromUserId,toUserId} and the
 * reversed pair, filtered to status IN ["interested","accepted"], BEFORE
 * attempting to save.
 *
 * This index is not redundant, though -- it's the safety net that closes
 * the race-condition window: if two requests from the same fromUserId to
 * the same toUserId hit the server at nearly the same time, both could
 * pass the app-level check before either write completes. The unique
 * index guarantees the DB itself rejects the second write atomically.
 * The controller catches that as Mongo error code 11000 and converts it
 * to the same 409 response as the app-level check, so callers see
 * consistent behavior either way.
 */
connectionRequestSchema.index(
  { fromUserId: 1, toUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["interested", "accepted"] } },
  },
);

/**
 * Guard against a user sending a request to themselves.
 * This lives on the model (not just the validator) because it's an
 * invariant of the data itself, not just of one particular route's input --
 * anything that ever calls .save() on this model gets this protection for free.
 */
connectionRequestSchema.pre("save", function (next) {
  if (this.fromUserId.equals(this.toUserId)) {
    return next(
      new ApiError(400, "You cannot send a connection request to yourself"),
    );
  }
  next();
});

const ConnectionRequest = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema,
);

export default ConnectionRequest;