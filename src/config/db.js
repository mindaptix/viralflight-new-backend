import mongoose from "mongoose";

const connectDB = async () => {
  const databaseURL = process.env.MONGO_URI || process.env.DATABASE_URL;

  if (!databaseURL) {
    console.error("MONGO_URI or DATABASE_URL is required");
    process.exit(1);
  }

  try {
    await mongoose.connect(databaseURL);
    console.log("MongoDB connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;
