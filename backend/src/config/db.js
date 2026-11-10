import mongoose from "mongoose";

async function connectDB(uri) {
    try {
      await mongoose.connect(uri);
      console.log("Database Connection Success!");
    } catch (error) {
      console.log("Database Connection Failed!");
    }
}

export default connectDB;