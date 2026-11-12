const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/AuthMiddleware");
const { ROLES } = require("../constants/Roles");
const {
  getTeamMembers,
  inviteMember,
  updateMemberRole,
  updateMemberProfile,
  reassignLeads,
  deactivateMember,
} = require("../controllers/TeamController");

// All team routes require authentication
router.use(protect);

// 1. List all active team members with their lead stats (Reps + Admins)
router.get("/", getTeamMembers);

// 2. Invite a new team member via email (Admin only)
router.post("/invite", authorize(ROLES.ADMIN), inviteMember);

// 3. Change member role (Admin only)
router.patch("/:id/role", authorize(ROLES.ADMIN), updateMemberRole);

// 4. Update member profile name/avatar (Admin or Self)
router.put("/:id", updateMemberProfile);

// 5. Transfer leads and tasks between reps (Admin only)
router.post("/reassign-leads", authorize(ROLES.ADMIN), reassignLeads);

// 6. Deactivate a team member (Admin only)
router.delete("/:id", authorize(ROLES.ADMIN), deactivateMember);

module.exports = router;
