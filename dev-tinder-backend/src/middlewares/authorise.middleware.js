import ApiError from "../utils/ApiError.util.js";

const requireRole = (...allowedRoles) => {
  // we are returning a middleware function
  // that will be used in the routes to check
  // if the authenticated user has the required role to access the route.

  return (req, res, next) => {
    // 1. Check if the authenticated user exists in the request object
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    // 2. Check if the user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden");
    }

    next();
  };
};

// This middleware function checks if the authenticated user is the owner of the resource they are trying to access.
const requireOwnership = (paramIdField) => {
  // we are returning a middleware function
  // that will be used in the routes to check
  // if the authenticated user is the owner of the resource.

  return (req, res, next) => {
    try {
      // 1. Check if the authenticated user exists in the request object
      const user = req.user;
      if (!user) {
        throw new ApiError(401, "Unauthorized");
      }

      // 2. Check if the resource ID is present in the request parameters
      // resourceId is the ID of the resource that the user is trying to access.
      const resourceId = req.params[paramIdField];

      if (!resourceId) {
        // misconfiguration — the route doesn't actually have this param
        throw new ApiError(
          500,
          `requireOwnership: missing param "${paramIdField}"`,
        );
      }

      // 3. Check if the authenticated user is the owner of the resource
      if (user._id.toString() !== resourceId) {
        throw new ApiError(
          403,
          "You do not have permission to access this resource",
        );
      }

      next();

    } catch (error) {
      next(error);
    }
  };
};

export { requireRole, requireOwnership };
