import app from "./app.js";
import connectDB from "./config/database.js";
import config from "./config/config.js";

const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Server started successfully on port ${config.port}`);
    });
  } catch (error) {
    console.log("Server start failed : ", error.message);
    process.exit(1);
  }
};

startServer();