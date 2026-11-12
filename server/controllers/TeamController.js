const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const { ROLES, ROLE_LIST } = require("../constants/Roles");
const { CLOSED_STAGES } = require("../constants/Stages");
const sendEmail = require("../utils/SendEmail");

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// -----------------------------------------------------------------------------
// 1. GET /api/team - List all active team members with their lead stats
// -----------------------------------------------------------------------------
const getTeamMembers = async (req, res) => {
  try {
    // Find all users except deactivated (role !== NONE)
    const users = await User.find({ role: { $ne: ROLES.NONE } })
      .select("-password")
      .sort({ role: 1, name: 1 }) // Admins first, then alphabetical
      .lean();

    // Aggregate lead counts and open pipeline values per team member
    const leadStats = await Lead.aggregate([
      {
        $group: {
          _id: "$owner",
          totalLeads: { $sum: 1 },
          openLeads: {
            $sum: {
              $cond: [{ $not: [{ $in: ["$stage", CLOSED_STAGES] }] }, 1, 0],
            },
          },
          openPipelineValue: {
            $sum: {
              $cond: [
                { $not: [{ $in: ["$stage", CLOSED_STAGES] }] },
                "$amountBase",
                0,
              ],
            },
          },
        },
      },
    ]);

    // Attach stats to each team member object
    const team = users.map((user) => {
      const stats = leadStats.find(
        (s) => s._id && s._id.toString() === user._id.toString()
      );
      return {
        ...user,
        stats: {
          totalLeads: stats ? stats.totalLeads : 0,
          openLeads: stats ? stats.openLeads : 0,
          openPipelineValue: stats
            ? Math.round(stats.openPipelineValue * 100) / 100
            : 0,
        },
      };
    });

    res.json({ success: true, team });
  } catch (err) {
    console.error("getTeamMembers error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 2. POST /api/team/invite - Invite a new team member by email (Admin only)
// -----------------------------------------------------------------------------
const inviteMember = async (req, res) => {
  try {
    const { email, name, role, password } = req.body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "A valid email is required." });
    }

    const assignedRole = role && ROLE_LIST.includes(role) && role !== ROLES.NONE
      ? role
      : ROLES.REP;

    let user = await User.findOne({ email: normalizedEmail });

    // If user already active
    if (user && user.role !== ROLES.NONE) {
      return res.status(400).json({
        success: false,
        message: "A team member with this email is already registered.",
      });
    }

    const defaultName = name && name.trim() ? name.trim() : normalizedEmail.split("@")[0];
    const temporaryPassword = password && password.trim() ? password.trim() : crypto.randomBytes(4).toString("hex");

    if (temporaryPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // If user previously deactivated, reactivate them
    if (user && user.role === ROLES.NONE) {
      user.role = assignedRole;
      user.name = defaultName;
      user.password = temporaryPassword;
    } else {
      user = new User({
        email: normalizedEmail,
        name: defaultName,
        role: assignedRole,
        password: temporaryPassword,
      });
    }

    await user.save();

    const loginLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/login`;

    await sendEmail({
      to: normalizedEmail,
      subject: "You've been invited to join GoatLeads CRM",
      text: `Hi ${user.name},\n\nYou have been invited to join GoatLeads as a ${user.role.toUpperCase()}.\n\nYour login credentials:\nEmail: ${normalizedEmail}\nPassword: ${temporaryPassword}\n\nSign in here:\n${loginLink}\n\nBest regards,\nGoatLeads Team`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
          <h2 style="color: #2563eb;">Welcome to GoatLeads CRM!</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>You have been invited by your sales team administrator to join GoatLeads as a <strong>${user.role.toUpperCase()}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${normalizedEmail}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 14px; font-weight: bold;">${temporaryPassword}</code></p>
          </div>
          <p style="margin: 24px 0;">
            <a href="${loginLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Sign In to GoatLeads
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">
            Please log in and update your password from your profile settings.
          </p>
        </div>
      `,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: `Invitation email sent to ${normalizedEmail}.`,
      member: userObj,
    });
  } catch (err) {
    console.error("inviteMember error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 3. PATCH /api/team/:id/role - Change a member's role (Admin only)
// -----------------------------------------------------------------------------
const updateMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (!role || !ROLE_LIST.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ROLE_LIST.join(", ")}`,
      });
    }

    // Prevent admin from accidentally demoting or locking themselves out
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Team member not found." });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Role updated to ${role}.`,
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("updateMemberRole error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 4. PUT /api/team/:id - Update member profile details (Admin or Self)
// -----------------------------------------------------------------------------
const updateMemberProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    // Only Admin can update other members; members can update their own profile
    const isSelf = req.user._id.toString() === id;
    const isAdmin = req.user.role === ROLES.ADMIN;
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden: Cannot edit other team members." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Team member not found." });
    }

    const { name, avatar, password } = req.body;
    if (name !== undefined) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar.trim();
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }
      user.password = password;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated.",
      member: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("updateMemberProfile error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 5. POST /api/team/reassign-leads - Transfer leads from one rep to another (Admin only)
// -----------------------------------------------------------------------------
const reassignLeads = async (req, res) => {
  try {
    const { fromUserId, toUserId, leadIds } = req.body;

    if (!fromUserId || !mongoose.isValidObjectId(fromUserId)) {
      return res.status(400).json({ success: false, message: "A valid fromUserId is required." });
    }
    if (!toUserId || !mongoose.isValidObjectId(toUserId)) {
      return res.status(400).json({ success: false, message: "A valid toUserId is required." });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: "Source and target team members must be different.",
      });
    }

    // Verify target recipient exists and is active
    const toUser = await User.findById(toUserId);
    if (!toUser || toUser.role === ROLES.NONE) {
      return res.status(404).json({
        success: false,
        message: "Target team member does not exist or is inactive.",
      });
    }

    // Build lead filter: either specified list of lead IDs or all leads owned by source
    const leadFilter = { owner: fromUserId };
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      const validLeadIds = leadIds.filter((id) => mongoose.isValidObjectId(id));
      leadFilter._id = { $in: validLeadIds };
    }

    // 1. Reassign leads in MongoDB
    const leadUpdateResult = await Lead.updateMany(leadFilter, {
      $set: { owner: toUserId },
    });

    // 2. Reassign any pending follow-up tasks attached to those leads
    const taskFilter = {
      assignedTo: fromUserId,
      status: "pending",
    };
    if (leadFilter._id) {
      taskFilter.lead = leadFilter._id;
    }
    const taskUpdateResult = await Task.updateMany(taskFilter, {
      $set: { assignedTo: toUserId },
    });

    res.json({
      success: true,
      message: `Successfully reassigned ${leadUpdateResult.modifiedCount} lead(s) and ${taskUpdateResult.modifiedCount} task(s) to ${toUser.name || toUser.email}.`,
      leadsReassigned: leadUpdateResult.modifiedCount,
      tasksReassigned: taskUpdateResult.modifiedCount,
    });
  } catch (err) {
    console.error("reassignLeads error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 6. DELETE /api/team/:id - Deactivate a team member (Admin only)
// -----------------------------------------------------------------------------
const deactivateMember = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Team member not found." });
    }

    // Check if the member still owns active leads
    const activeLeadCount = await Lead.countDocuments({ owner: id });
    if (activeLeadCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate ${user.name || user.email} because they currently own ${activeLeadCount} lead(s). Please reassign their leads first using /api/team/reassign-leads.`,
        activeLeads: activeLeadCount,
      });
    }

    // Soft delete: setting role to NONE prevents login while preserving history
    user.role = ROLES.NONE;
    await user.save();

    res.json({
      success: true,
      message: `Team member ${user.name || user.email} has been deactivated.`,
    });
  } catch (err) {
    console.error("deactivateMember error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  getTeamMembers,
  inviteMember,
  updateMemberRole,
  updateMemberProfile,
  reassignLeads,
  deactivateMember,
};