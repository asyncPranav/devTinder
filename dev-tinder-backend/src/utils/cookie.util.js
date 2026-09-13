import config from "../config/config.js";

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax", // lax is used to allow the cookie to be sent with cross-site requests, but only for top-level navigation
  path: "/",
  maxAge: 15 * 24 * 60 * 60 * 1000,
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
};

export { setRefreshTokenCookie, clearRefreshTokenCookie };
