import userModel from "../models/user.model.js";
import connectionRequestModel from "../models/connectionRequest.model.js";

import ApiError from "../utils/ApiError.util.js";

// Active relationship statuses that should block a new request.
// "interested" = pending request, "accepted" = connection exists.
const ACTIVE_STATUSES = ["interested", "accepted"];

// POST /request/send/:status/:toUserId
const sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user._id;
    const { status, toUserId } = req.params;

    // 1. Prevent a user from sending a request to themselves.
    // Also protected by the model's pre("save") hook.
    if (fromUserId.toString() === toUserId.toString()) {
      throw new ApiError(
        400,
        "You cannot send a connection request to yourself",
      );
    }

    // 2. Check that the recipient exists.
    // Validator checks the ObjectId format; this checks the actual User document.
    const toUser = await userModel.findById(toUserId);
    if (!toUser) {
      throw new ApiError(404, "User not found");
    }

    // 3. Check if there is already an active connection request between the two users
    // A → B OR B → A.
    // Rejected/ignored requests do not block a new request.
    const existingRequest = await connectionRequestModel.findOne({
      status: { $in: ACTIVE_STATUSES },
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });

    if (existingRequest) {
      throw new ApiError(
        409,
        "An active connection request already exists between these users",
      );
    }

    // 4. Create a new connection request
    // The partial unique index is the database-level safety net for a
    // duplicate A → B insert caused by a race condition.
    const connection = await connectionRequestModel.create({
      fromUserId,
      toUserId,
      status,
    });

    // 5. Populate the fromUserId and toUserId fields for the response.
    await connection.populate([
      {
        path: "fromUserId",
        select: "firstName lastName photoUrl",
      },
      {
        path: "toUserId",
        select: "firstName lastName photoUrl",
      },
    ]);

    res.status(201).json({
      status: "success",
      message: `Connection request ${status === "interested" ? "sent" : "recorded"} successfully`,
      data: connection,
    });
  } catch (error) {
    // 6. MongoDB error 11000 means a unique index was violated.
    // Convert it to the same 409 Conflict used by the app-level check.
    if (error.code === 11000) {
      return next(
        new ApiError(
          409,
          "An active connection request already exists between these users",
        ),
      );
    }
    next(error);
  }
};

// POST /request/review/:status/:requestId
const reviewRequest = async (req, res, next) => {
  try {
    const loggedInUserId = req.user._id;
    const { status, requestId } = req.params;

    // 1. Find the connection request using the requestId from the URL.
    // We need the request document to check who received it and what
    // its current status is.
    const connectionRequest = await connectionRequestModel.findById(requestId);

    if (!connectionRequest) {
      throw new ApiError(404, "Connection request not found");
    }

    // 2. Only the user who received the request can review it.
    // The receiver's ID is stored in toUserId, so we compare it with
    // the currently logged-in user's ID. This prevents the sender or
    // another user from accepting/rejecting someone else's request.
    if (connectionRequest.toUserId.toString() !== loggedInUserId.toString()) {
      throw new ApiError(
        403,
        "You are not authorized to review this connection request",
      );
    }

    // 3. A request can only be reviewed while its status is "interested".
    // Once it has been accepted or rejected, it should not be reviewed again.
    // An "ignored" request also cannot be reviewed because it is not a
    // pending request in the receiver's request list.
    if (connectionRequest.status !== "interested") {
      throw new ApiError(
        400,
        `This request has already been reviewed (current status: ${connectionRequest.status})`,
      );
    }

    // 4. Update the request with the new status and save it to MongoDB.
    // For example, the receiver can change "interested" to "accepted"
    // or "rejected".
    connectionRequest.status = status;
    await connectionRequest.save();

    // 5. Populate the fromUserId and toUserId fields for the response.
    await connectionRequest.populate([
      {
        path: "fromUserId",
        select: "firstName lastName photoUrl",
      },
      {
        path: "toUserId",
        select: "firstName lastName photoUrl",
      },
    ]);

    return res.status(200).json({
      status: "success",
      message: `Connection request ${status} successfully`,
      data: { connectionRequest },
    });
  } catch (error) {
    next(error);
  }
};

export { sendRequest, reviewRequest };
