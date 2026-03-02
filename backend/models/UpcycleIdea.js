const mongoose = require("mongoose");

const upcycleIdeaSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    itemLabel: String,
    condition: String,
    material: String,
    ideas: [
      {
        title: String,
        description: String,
        steps: [String],
        materials: [String],
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
        },
        timeMin: Number,
      },
    ],
    taskId: {
      type: String,
      description: "Celery task ID for tracking scraping progress",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UpcycleIdea", upcycleIdeaSchema);
