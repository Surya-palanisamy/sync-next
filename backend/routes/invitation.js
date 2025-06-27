const express = require("express");
const Invitation = require("../models/invitation");
const User = require("../models/User");
const Team = require("../models/Team");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

const router = express.Router();

// Get user's invitations
router.get("/", auth, async (req, res) => {
  try {
    const status = req.query.status || "pending";
    console.log(`📨 Getting ${status} invitations for user: ${req.userId}`);

    const invitations = await Invitation.find({
      toUser: req.userId,
      status: status,
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .populate("fromUser", "username email avatar")
      .populate("team", "name description")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${invitations.length} invitations`);
    res.json(invitations);
  } catch (error) {
    console.error("❌ Error fetching invitations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send invitation
router.post("/", auth, async (req, res) => {
  try {
    const { userId, teamId, role = "Member", message } = req.body;

    console.log("📤 Sending invitation:", {
      userId,
      teamId,
      role,
      fromUser: req.userId,
    });

    // Validate input
    if (!userId || !teamId) {
      return res
        .status(400)
        .json({ message: "User ID and Team ID are required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(teamId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if user exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if team exists and user has permission
    const team = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if current user is team member with permission
    const currentUserMember = team.members.find(
      (member) => member.user._id.toString() === req.userId
    );
    if (!currentUserMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this team" });
    }

    const hasPermission =
      currentUserMember.role === "Leader" || team.settings?.allowMemberInvite;
    if (!hasPermission) {
      return res
        .status(403)
        .json({ message: "You don't have permission to invite members" });
    }

    // Check if user is already a member
    const isAlreadyMember = team.members.some(
      (member) => member.user._id.toString() === userId
    );
    if (isAlreadyMember) {
      return res.status(400).json({ message: "User is already a team member" });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({
      toUser: userId,
      team: teamId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      return res
        .status(400)
        .json({
          message: "User already has a pending invitation for this team",
        });
    }

    // Create invitation
    const invitation = new Invitation({
      fromUser: req.userId,
      toUser: userId,
      team: teamId,
      role,
      message,
    });

    await invitation.save();
    await invitation.populate("fromUser", "username email avatar");
    await invitation.populate("team", "name description");
    await invitation.populate("toUser", "username email");

    console.log("✅ Invitation created successfully");
    res.status(201).json({
      message: "Invitation sent successfully",
      invitation,
    });
  } catch (error) {
    console.error("❌ Error sending invitation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Accept invitation
router.put("/:id/accept", auth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    console.log(
      `✅ Accepting invitation: ${invitationId} by user: ${req.userId}`
    );

    const invitation = await Invitation.findOne({
      _id: invitationId,
      toUser: req.userId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("team");

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invitation not found or expired" });
    }

    // Add user to team
    const team = await Team.findById(invitation.team._id);
    team.members.push({
      user: req.userId,
      role: invitation.role,
    });
    await team.save();

    // Add team to user's teams
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { teams: invitation.team._id },
    });

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    // Populate team data
    await team.populate("members.user", "username email avatar isOnline");

    console.log("✅ Invitation accepted successfully");
    res.json({
      message: "Invitation accepted successfully",
      team,
    });
  } catch (error) {
    console.error("❌ Error accepting invitation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Decline invitation
router.put("/:id/decline", auth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    console.log(
      `❌ Declining invitation: ${invitationId} by user: ${req.userId}`
    );

    const invitation = await Invitation.findOne({
      _id: invitationId,
      toUser: req.userId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invitation not found or expired" });
    }

    invitation.status = "declined";
    await invitation.save();

    console.log("✅ Invitation declined successfully");
    res.json({ message: "Invitation declined successfully" });
  } catch (error) {
    console.error("❌ Error declining invitation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel invitation (by sender)
router.delete("/:id", auth, async (req, res) => {
  try {
    const invitationId = req.params.id;
    console.log(
      `🗑️ Canceling invitation: ${invitationId} by user: ${req.userId}`
    );

    const invitation = await Invitation.findOne({
      _id: invitationId,
      fromUser: req.userId,
      status: "pending",
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    await invitation.deleteOne();

    console.log("✅ Invitation canceled successfully");
    res.json({ message: "Invitation canceled successfully" });
  } catch (error) {
    console.error("❌ Error canceling invitation:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
