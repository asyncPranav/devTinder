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

    // Attach the decoded token payload to the request object for further use. 
    // We did it because we will need the sessionId in the refreshToken route to check if the session exists in the database.
    // If we make req.user = decoded, we will lose the user data that we need in the getMe route. So we will make req.auth = decoded to keep the decoded token payload for further use.
    req.auth = decoded; // dcoded = { sub: string, sessionId: string, iat: number, exp: number }

    // 6. continue to protected routes
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;


/* 
  req.auth.sub → "Which user does this token belong to?"
      
  req.auth.sid → "Which session/device is this token from?"

  req.user → "Give me the actual User document."
*/