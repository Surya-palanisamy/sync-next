const express = require("express");
const User = require("../models/User");
const Team = require("../models/Team");
const Invitation = require("../models/invitation");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

const router = express.Router();

// Debug middleware for this router
router.use((req, res, next) => {
  console.log(`🔍 Users route: ${req.method} ${req.path}`);
  console.log(`📋 Request body:`, req.body);
  console.log(`🔑 User ID from auth:`, req.userId);
  next();
});

// Get all users (for search/invite functionality)
router.get("/", auth, async (req, res) => {
  try {
    const search = req.query.search || "";
    console.log(`🔍 Searching users with term: "${search}"`);

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query).select("-password").limit(20);
    console.log(`✅ Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error("❌ Error searching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create team
router.post("/teams", auth, async (req, res) => {
  try {
    console.log(`🏗️ Creating team for user: ${req.userId}`);

    const team = new Team({
      ...req.body,
      createdBy: req.userId,
      members: [
        {
          user: req.userId,
          role: "Leader",
        },
      ],
    });

    await team.save();
    await team.populate("members.user", "username email avatar");
    await team.populate("createdBy", "username email avatar");

    // Add team to user's teams
    await User.findByIdAndUpdate(req.userId, {
      $push: { teams: team._id },
    });

    console.log(`✅ Team created: ${team.name}`);
    res.status(201).json(team);
  } catch (error) {
    console.error("❌ Error creating team:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's teams
router.get("/teams", auth, async (req, res) => {
  try {
    console.log(`📋 Getting teams for user: ${req.userId}`);

    const user = await User.findById(req.userId).populate({
      path: "teams",
      populate: {
        path: "members.user",
        select: "username email avatar isOnline",
      },
    });

    console.log(`✅ Found ${user.teams?.length || 0} teams`);
    res.json(user.teams || []);
  } catch (error) {
    console.error("❌ Error fetching teams:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send invitation (UPDATED - now creates invitation instead of directly adding)
router.post("/teams/:teamId/invite", auth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    const teamId = req.params.teamId;

    console.log("=== 📤 SENDING INVITATION ===");
    console.log(`📊 Request data:`, {
      userId,
      teamId,
      requesterId: req.userId,
      message,
    });

    // Validate input
    if (!userId) {
      console.log("❌ Missing userId");
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!teamId) {
      console.log("❌ Missing teamId");
      return res.status(400).json({ message: "Team ID is required" });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("❌ Invalid userId format:", userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      console.log("❌ Invalid teamId format:", teamId);
      return res.status(400).json({ message: "Invalid team ID format" });
    }

    // Find the user to invite
    console.log("🔍 Looking for user:", userId);
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      console.log("❌ User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }
    console.log("✅ User found:", userToInvite.username);

    // Find the team
    console.log("🔍 Looking for team:", teamId);
    const team = await Team.findById(teamId).populate(
      "members.user",
      "username email"
    );
    if (!team) {
      console.log("❌ Team not found:", teamId);
      return res.status(404).json({ message: "Team not found" });
    }
    console.log("✅ Team found:", team.name);

    // Check if current user is team member and has permission to invite
    console.log("🔍 Checking current user permissions...");
    const currentUserMember = team.members.find((member) => {
      const memberId = member.user._id.toString();
      const requesterId = req.userId.toString();
      return memberId === requesterId;
    });

    if (!currentUserMember) {
      console.log("❌ Current user not a team member:", req.userId);
      return res
        .status(403)
        .json({ message: "You are not a member of this team" });
    }
    console.log(
      "✅ Current user is team member with role:",
      currentUserMember.role
    );

    // Check if current user has permission to invite
    const hasPermission =
      currentUserMember.role === "Leader" || team.settings?.allowMemberInvite;
    if (!hasPermission) {
      console.log("❌ User doesn't have permission to invite:", {
        role: currentUserMember.role,
        allowMemberInvite: team.settings?.allowMemberInvite,
      });
      return res
        .status(403)
        .json({ message: "You don't have permission to invite members" });
    }
    console.log("✅ User has permission to invite");

    // Check if user is already a member
    console.log("🔍 Checking if user is already a member...");
    const isAlreadyMember = team.members.some((member) => {
      const memberId = member.user._id.toString();
      const targetUserId = userId.toString();
      return memberId === targetUserId;
    });

    if (isAlreadyMember) {
      console.log("❌ User already a member:", userId);
      return res.status(400).json({ message: "User is already a team member" });
    }
    console.log("✅ User is not already a member");

    // Check if there's already a pending invitation
    console.log("🔍 Checking for existing pending invitations...");
    const existingInvitation = await Invitation.findOne({
      toUser: userId,
      team: teamId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      console.log("❌ User already has a pending invitation");
      return res
        .status(400)
        .json({
          message: "User already has a pending invitation for this team",
        });
    }
    console.log("✅ No existing pending invitations");

    // Create invitation
    console.log("📤 Creating invitation...");
    const invitation = new Invitation({
      fromUser: req.userId,
      toUser: userId,
      team: teamId,
      role: "Member",
      message: message || `You've been invited to join ${team.name}`,
    });

    await invitation.save();
    await invitation.populate("fromUser", "username email avatar");
    await invitation.populate("team", "name description");
    await invitation.populate("toUser", "username email");

    console.log("✅ Invitation created successfully");
    console.log("=== ✅ INVITATION SENT ===");

    res.status(201).json({
      message: "Invitation sent successfully",
      invitation,
    });
  } catch (error) {
    console.error("💥 Error sending invitation:", error);
    console.log("=== ❌ INVITATION ERROR ===");
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Join team (for public teams or when user has invite link)
router.post("/teams/:teamId/join", auth, async (req, res) => {
  try {
    console.log(`🚪 User ${req.userId} joining team ${req.params.teamId}`);

    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if user is already a member
    const isMember = team.members.some(
      (member) => member.user.toString() === req.userId
    );

    if (isMember) {
      return res.status(400).json({ message: "Already a team member" });
    }

    // Add user to team
    team.members.push({
      user: req.userId,
      role: "Member",
    });

    await team.save();

    // Add team to user's teams
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { teams: team._id },
    });

    await team.populate("members.user", "username email avatar");
    console.log(`✅ User joined team successfully`);
    res.json(team);
  } catch (error) {
    console.error("❌ Error joining team:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Remove member from team
router.delete("/teams/:teamId/members/:userId", auth, async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    console.log(`🗑️ Removing user ${userId} from team ${teamId}`);

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if current user is team leader
    const currentUserMember = team.members.find(
      (member) => member.user.toString() === req.userId
    );
    if (!currentUserMember || currentUserMember.role !== "Leader") {
      return res
        .status(403)
        .json({ message: "Only team leaders can remove members" });
    }

    // Remove member from team
    team.members = team.members.filter(
      (member) => member.user.toString() !== userId
    );
    await team.save();

    // Remove team from user's teams
    await User.findByIdAndUpdate(userId, {
      $pull: { teams: teamId },
    });

    await team.populate("members.user", "username email avatar isOnline");
    console.log(`✅ User removed from team successfully`);
    res.json(team);
  } catch (error) {
    console.error("❌ Error removing team member:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
