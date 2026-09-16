import bcrypt from "bcrypt";

import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";

import ApiError from "../utils/ApiError.util.js";
import { clearRefreshTokenCookie } from "../utils/cookie.util.js";

// It take a user object and returns a sanitized version of the user object
// containing only the fields that should be exposed to the client.
const sanitizeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  age: user.age,
  gender: user.gender,
  about: user.about,
  skills: user.skills,
  photoUrl: user.photoUrl,
  isPremium: user.isPremium,
  membershipType: user.membershipType,
  role: user.role,
});

// GET /api/profile/view
const getProfile = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Profile retrieved successfully",
      data: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/profile/edit
const updateProfile = async (req, res, next) => {
  try {
    // 1. Check if the authenticated user exists in the request object
    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Define the allowed fields that can be updated
    const ALLOWED_FIELDS = ["age", "about", "skills", "photoUrl"];

    // 3. Create an object to hold the updates
    // Build the update object from an explicit allow-list — never pass
    // req.body straight to Mongoose, or a client could smuggle in
    // { role: "admin" } / { isPremium: true } alongside a legit field.
    const updates = {};

    // 4. Loop through the allowed fields and check if they are present in the request body
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // 5. If no valid fields are provided, return a 400 Bad Request response
    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields provided for update");
    }

    // 6. Update the user's profile with the allowed fields
    const updatedUser = await userModel.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
    });

    // 7. If the user is not found, return a 404 Not Found response
    // Why we did this when we have already checked for the user in req.user?
    // Because the user might have been deleted from the database after the request was made but before the update operation was performed.
    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    // 8. Return the updated user profile in the response
    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/profile/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // We can not use req.user because it does not contain the password field, which is required for password comparison.
    // Therefore, we need to fetch the user from the database with the password field included.
    /*
    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    } 
    */

    // 1. Fetch the user from the database with the password field included
    const user = await userModel.findById(req.user._id).select("+password");
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // 2. Check if the current password matches the user's password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }

    // 3. if current password is correct then hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    // 5. Revoke every active session for this user — including the one
    // making this request. Old refresh tokens stop working; the client
    // must log in again with the new password on every device.
    await sessionModel.updateMany(
      { user: user._id, revoked: false },
      { $set: { revoked: true } },
    );

    // 6. clear the refresh token cookie on this device too
    clearRefreshTokenCookie(res);

    // 7. Return a success response
    return res.status(200).json({
      status: "success",
      message: "Password changed successfully. Please log in again.",
    });

  } catch (error) {
    next(error);
  }
};

export { getProfile, updateProfile, changePassword };
