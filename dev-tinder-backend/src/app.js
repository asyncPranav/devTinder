import express from "express";
import cookieParser from "cookie-parser";

// middlewares
import errorHandler from "./middlewares/error.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";

// routes
import authRouter from "./routes/auth.route.js";
import profileRouter from "./routes/profile.route.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "DevTinder api is running",
  });
});

// routes
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

// Handle 404 errors
app.use(notFound);

// Handle other errors
app.use(errorHandler);

export default app;
