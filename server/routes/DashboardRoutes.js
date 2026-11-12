const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/AuthMiddleware");
const {
  getSummary,
  getByStage,
  getByCountry,
  getLostReasons,
  getRepPerformance,
  getExchangeRates,
} = require("../controllers/DashboardController");

// Every dashboard route requires a valid logged-in user
router.use(protect);

// 1. Overall pipeline KPIs (total leads, open value, won/lost, win rate)
router.get("/summary", getSummary);

// 2. Kanban stage breakdown (all 8 stages with counts and values)
router.get("/by-stage", getByStage);

// 3. Country breakdown (counts and values per country)
router.get("/by-country", getByCountry);

// 4. Lost reasons post-mortem breakdown
router.get("/lost-reasons", getLostReasons);

// 5. Sales rep performance & leaderboard
router.get("/rep-performance", getRepPerformance);

// 6. Live USD-based exchange rates for currency switching
router.get("/rates", getExchangeRates);

module.exports = router;
