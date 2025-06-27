const mongoose = require("mongoose")

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["Leader", "Member", "Reviewer"],
          default: "Member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    settings: {
      allowMemberInvite: {
        type: Boolean,
        default: false,
      },
      publicJoin: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Team", teamSchema)
