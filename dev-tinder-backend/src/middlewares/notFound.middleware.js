import ApiError from "../utils/ApiError.util.js";

const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not Found - ${req.originalUrl}`);
  next(error);
};

export default notFound;
