import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Database connected successfully.");
  } catch (error) {
    console.log("Database connection failed : ", error.message);
    throw error;
  }
};

export default connectDB;
