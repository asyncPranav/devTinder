import jwt from "jsonwebtoken";
import config from "../config/config.js";
import ApiError from "./ApiError.util.js";

const generateAccessToken = (userId, sessionId) => {
  // return a string -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N...9fQ.XYZ...
  return jwt.sign(
    {
      sub: userId.toString(),
      sid: sessionId.toString(),
    },
    config.jwtAccessSecret,
    {
      expiresIn: "15m",
    },
  );
};

const generateRefreshToken = (userId, sessionId) => {
  // return a string -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N...9fQ.XYZ...
  return jwt.sign(
    {
      sub: userId.toString(),
      sid: sessionId.toString(),
    },
    config.jwtRefreshSecret,
    {
      expiresIn: "15d",
    },
  );
};

const verifyAccessToken = (token) => {
  try {
    // it return decoded payload -> { sub: 'user_id', sid: 'session_id', iat: 1690000000, exp: 1690003600 }
    return jwt.verify(token, config.jwtAccessSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }
};

const verifyRefreshToken = (token) => {
  try {
    // it return decoded payload -> { sub: 'user_id', sid: 'session_id', iat: 1690000000, exp: 1690003600 }
    return jwt.verify(token, config.jwtRefreshSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};