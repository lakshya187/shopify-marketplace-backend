import Mongoose from "#schemas/mongoose.js";

const AuthenticationSchema = new Mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_salt: {
      type: String,
      required: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "user"],
      default: "user",
    },
    storeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    store: {
      type: Mongoose.Schema.Types.ObjectId,
      ref: "stores",
    },
  },
  { timestamps: true },
);

export default Mongoose.model("authentications", AuthenticationSchema);
