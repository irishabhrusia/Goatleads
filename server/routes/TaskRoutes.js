const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/AuthMiddleware");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require("../controllers/TaskController");

// All task routes require authentication
router.use(protect);

router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", getTask);
router.put("/:id", updateTask);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", deleteTask);

module.exports = router;
