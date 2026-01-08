import mongoose from "mongoose";

const userSchema = mongoose.Schema(
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

const User = mongoose.model("User", userSchema,"Users");
export default User;