import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: [true, "First name is required"],
    },

    lastName: {
      type: String,
      trim: true,
      required: [true, "Last name is required"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Invalid email format",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },

    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [13, "Age must be at least 13"],
      max: [100, "Age cannot exceed 100"],
    },

    about: {
      type: String,
      trim: true,
      maxlength: [500, "About cannot exceed 500 characters"],
      default: "",
    },

    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other"],
    },

    skills: {
      type: [String],
      default: [],
      validate: {
        validator: function (skills) {
          return skills.length <= 10;
        },
        message: "You can add a maximum of 10 skills",
      },
    },

    photoUrl: {
      type: String,
      trim: true,
      default: function () {
        return `https://api.dicebear.com/10.x/glyphs/svg?seed=${this.firstName}`;
      },
      validate: {
        validator: function (url) {
          return validator.isURL(url);
        },
        message: "Please provide a valid photo URL",
      },
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    membershipType: {
      type: String,
      enum: ["free", "silver", "gold"],
      default: "free",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;