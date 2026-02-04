import mongoose from "mongoose";
import {authDB} from "../config/db.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Enter a username"],
    },
    fullname: {
      type: String,
      required: [true, "Enter a fullname"],
    },
    email: {
      type: String,
      required: [true, "Enter an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Enter a password"],
    },
    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },
  },
  { timestamps: true }
);

const User = authDB.model("User", userSchema,"Users");
export default User;