import mongoose from "mongoose";

const managerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: function () {
        return this.role !== "Admin";
      },
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    role: {
      type: String,
      enum: ["Admin", "Manager", "Sale Assistant"],
      default: "Manager",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Manager", managerSchema);
