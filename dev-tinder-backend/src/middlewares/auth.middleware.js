import userModel from "../models/user.model.js";
import ApiError from "../utils/ApiError.util.js";
import { verifyAccessToken } from "../utils/jwt.util.js";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if the Authorization header is present and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Extract the access token from the Authorization header
    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
      throw new ApiError(401, "Access token is missing");
    }

    // 3. Verify the access token
    const decoded = verifyAccessToken(accessToken);

    // 4. Check if the authenticated user exists in the database
    const user = await userModel.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    // 5. Attach the authenticated user to the request object for further use
    req.user = user;

    // 6. continue to protected routes
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;