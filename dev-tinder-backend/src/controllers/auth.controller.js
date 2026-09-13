import mongoose from "mongoose";
import bcrypt from "bcrypt";

// import config from "../config/config.js";

import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";

import ApiError from "../utils/ApiError.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.util.js";
import { setRefreshTokenCookie } from "../utils/cookie.util.js";

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

    // 10. Return the created user (excluding password)
    // 11. Include the access token and refresh token in the response
    res.status(201).json({
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

export { register, login };
