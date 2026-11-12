const express = require("express");
const { protect } = require("../middlewares/AuthMiddleware");
const {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  updateStage,
  uploadMiddleware,
  importLeads,
  exportLeads,
} = require("../controllers/LeadController");
const {
  getLeadActivities,
  createLeadActivity,
  deleteLeadActivity,
} = require("../controllers/ActivityController");
const {
  getLeadHealth,
  generateCopilotDraft,
} = require("../controllers/CopilotController");

const router = express.Router();

// All lead routes require a valid JWT
router.use(protect);

// ── /api/leads/export — MUST be before /:id ──────────────────────────────────
// If this were after /:id, Express would treat the word "export" as a lead id.
router.get("/export", exportLeads);

// ── /api/leads/import — MUST be before /:id ──────────────────────────────────
// uploadMiddleware runs first to parse the multipart file, then importLeads.
router.post("/import", uploadMiddleware, importLeads);

// ── /api/leads ────────────────────────────────────────────────────────────────
router.route("/")
  .get(getLeads)
  .post(createLead);

// ── /api/leads/:id ────────────────────────────────────────────────────────────
router.route("/:id")
  .get(getLead)
  .put(updateLead)
  .delete(deleteLead);

// ── /api/leads/:id/stage — Kanban drag-and-drop ───────────────────────────────
// PATCH is the right HTTP method here: we're doing a partial update (stage only),
// not replacing the whole document like PUT does.
router.patch("/:id/stage", updateStage);

// ── /api/leads/:id/activities — Lead notes & timeline ─────────────────────────
router.route("/:id/activities")
  .get(getLeadActivities)
  .post(createLeadActivity);

router.delete("/:id/activities/:activityId", deleteLeadActivity);

// ── /api/leads/:id/health & /copilot — Deal Health Score & AI Copilot ─────────
router.get("/:id/health", getLeadHealth);
router.post("/:id/copilot", generateCopilotDraft);

module.exports = router;

