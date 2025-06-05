import mongoose from "mongoose";

const brainCorrectionSchema = new mongoose.Schema({
  prompt: String,
  correctedReply: String,
  user: { type: String, default: "admin" }, // Optional field
  tags: [String], // Like ["stripe", "2d", "cashout"]
  createdAt: { type: Date, default: Date.now },
});

const BrainCorrection = mongoose.model(
  "BrainCorrection",
  brainCorrectionSchema
);
export default BrainCorrection;
