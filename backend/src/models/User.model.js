import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: [25, "Name can only contains maximum 25 characters"],
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  const user = this;
  if (!user.isModified("password")) {
    return;
  }
  user.password = await bcrypt.hash(user.password, 10);
});

userSchema.set("toJSON", {
  versionKey: false,
  transform: function (doc, ret) {
    delete ret.password;
  },
});

userSchema.index({ email: 1 });

const User = model("User", userSchema);

export default User;
