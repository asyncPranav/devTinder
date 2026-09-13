import mongoose from "mongoose";
import bcrypt from "bcrypt";

// import config from "../config/config.js";

import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";

import ApiError from "../utils/ApiError.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../utils/jwt.util.js";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookie.util.js";

const register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      age,
      gender,
      about,
      skills,
      photoUrl,
    } = req.body;

    // 1. Check if email already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create a new user
    const newUser = await userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      age,
      gender,
      about,
      skills,
      photoUrl,
    });

    // 4. Generate session ID before creating tokens
    const sessionId = new mongoose.Types.ObjectId();

    // 5. Generate refresh token
    const refreshToken = generateRefreshToken(newUser._id, sessionId);

    // 6. Hash the refresh token before storing it in the database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // 7. Create a new session in the database with the hashed refresh token
    await sessionModel.create({
      _id: sessionId,
      user: newUser._id,
      refreshToken: hashedRefreshToken,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    });

    // 8. Set the refresh token in an HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // 9. Generate access token
    const accessToken = generateAccessToken(newUser._id, sessionId);

    // 10. Return the created user (excluding password and including access token) in the response
    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          age: newUser.age,
          gender: newUser.gender,
          about: newUser.about,
          skills: newUser.skills,
          photoUrl: newUser.photoUrl,
          isPremium: newUser.isPremium,
          membershipType: newUser.membershipType,
        },
        accessToken,
        // refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if the user exists
    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    // 2. Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid email or password");
    }

    // 3. Generate session ID before creating tokens
    const sessionId = new mongoose.Types.ObjectId();

    // 4. Generate refresh token
    const refreshToken = generateRefreshToken(user._id, sessionId);

    // 5. Hash the refresh token before storing it in the database
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // 6. Create a new session in the database with the hashed refresh token
    await sessionModel.create({
      _id: sessionId,
      user: user._id,
      refreshToken: hashedRefreshToken,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    });

    // 7. Set the refresh token in an HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // 8. Generate access token
    const accessToken = generateAccessToken(user._id, sessionId);

    // 9. Return safe user data + access token
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
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
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }
    return res.status(200).json({
      status: "success",
      message: "User data retrieved successfully",
      data: {
        user: {
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
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    // 1. Get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token is missing");
    }

    // 2. Verify the refresh token : we will get { sub: string, sessionId: string }
    const decoded = verifyRefreshToken(refreshToken);

    // 3. Check if the session exists in the database
    const session = await sessionModel
      .findOne({
        _id: decoded.sid,
        user: decoded.sub,
      })
      .select("+refreshToken");

    // 4. If no matching session is found, return an error
    if (!session) {
      throw new ApiError(401, "Session not found");
    }

    // 5. Check whether the session has been revoked
    if (session.revoked) {
      throw new ApiError(401, "Session has been revoked");
    }

    // 6. Check whether the session has expired
    if (session.expiresAt < new Date()) {
      throw new ApiError(401, "Session has expired");
    }

    // 7. Verify the refresh token against the hashed version stored in the database
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      session.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // 8. Generate a new access token
    const newAccessToken = generateAccessToken(decoded.sub, decoded.sid);

    // 9. For security reasons, we can also generate a new refresh token and update the session in the database
    const newRefreshToken = generateRefreshToken(decoded.sub, decoded.sid);
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // 10. Update the session in the database with the new hashed refresh token
    session.refreshToken = hashedNewRefreshToken;
    session.expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await session.save();

    // 11. Set the new refresh token in an HTTP-only cookie
    setRefreshTokenCookie(res, newRefreshToken);

    // 12. Return the new access token in the response
    return res.status(200).json({
      status: "success",
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Find the current session using the session ID from the access token
    // and make sure it belongs to the authenticated user.
    const session = await sessionModel.findOne({
      _id: req.auth.sid,
      user: req.auth.sub, // we can also use req.user._id, but we will use req.auth.sub to be consistent with the refreshToken route
    });

    // If the session doesn't exist, reject the request.
    if (!session) {
      throw new ApiError(401, "Session not found");
    }

    // Revoke only the current session.
    session.revoked = true;

    await session.save();

    // Remove the refresh token cookie from this device's browser.
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    // Our authenticate middleware already verified the access token
    // and attached the authenticated user to req.user.
    // req.user contains the User document.

    // Revoke all active sessions belonging to this user.
    await sessionModel.updateMany(
      {
        user: req.auth.sub, // we can also use req.user._id, but we will use req.auth.sub to be consistent with the refreshToken route
        revoked: false,
      },
      {
        $set: { revoked: true },
      },
    );

    // Clear the refresh token cookie from the current device.
    clearRefreshTokenCookie(res);

    // 200 - OK
    return res.status(200).json({
      status: "success",
      message: "Logged out from all devices successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { register, login, getMe, refreshToken, logout, logoutAll };
