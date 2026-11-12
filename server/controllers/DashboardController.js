const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const { STAGES, STAGE_LIST, CLOSED_STAGES } = require("../constants/Stages");
const { getRates } = require("../utils/ExchangeRateService");

// Helper: build optional match filter (e.g. filter by rep/owner if passed in query)
const getBaseFilter = (query) => {
  const filter = {};
  if (query.owner && mongoose.isValidObjectId(query.owner)) {
    filter.owner = new mongoose.Types.ObjectId(query.owner);
  }
  return filter;
};

// -----------------------------------------------------------------------------
// 1. GET /api/dashboard/summary
// Returns high-level metrics: total leads, open pipeline value, won/lost values
// -----------------------------------------------------------------------------
const getSummary = async (req, res) => {
  try {
    const filter = getBaseFilter(req.query);

    const pipeline = [];

    // Filter by owner if specified
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // Group all matching leads into a single summary document
    pipeline.push({
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },

        // Open pipeline: any lead that is NOT Closed Won and NOT Closed Lost
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

        // Closed Won stats
        wonCount: {
          $sum: {
            $cond: [{ $eq: ["$stage", STAGES.CLOSED_WON] }, 1, 0],
          },
        },
        wonValue: {
          $sum: {
            $cond: [{ $eq: ["$stage", STAGES.CLOSED_WON] }, "$amountBase", 0],
          },
        },

        // Closed Lost stats
        lostCount: {
          $sum: {
            $cond: [{ $eq: ["$stage", STAGES.CLOSED_LOST] }, 1, 0],
          },
        },
        lostValue: {
          $sum: {
            $cond: [{ $eq: ["$stage", STAGES.CLOSED_LOST] }, "$amountBase", 0],
          },
        },
      },
    });

    const results = await Lead.aggregate(pipeline);

    // If there are no leads yet, return safe zero values
    const raw = results[0] || {
      totalLeads: 0,
      openLeads: 0,
      openPipelineValue: 0,
      wonCount: 0,
      wonValue: 0,
      lostCount: 0,
      lostValue: 0,
    };

    // Calculate win rate percentage: won / (won + lost)
    const closedCount = raw.wonCount + raw.lostCount;
    const winRate =
      closedCount > 0
        ? Number(((raw.wonCount / closedCount) * 100).toFixed(1))
        : 0;

    res.json({
      success: true,
      summary: {
        totalLeads: raw.totalLeads,
        openLeads: raw.openLeads,
        openPipelineValue: Math.round(raw.openPipelineValue * 100) / 100,
        wonCount: raw.wonCount,
        wonValue: Math.round(raw.wonValue * 100) / 100,
        lostCount: raw.lostCount,
        lostValue: Math.round(raw.lostValue * 100) / 100,
        winRate,
      },
    });
  } catch (err) {
    console.error("getSummary error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 2. GET /api/dashboard/by-stage
// Returns count + total amountBase for all 8 stages (Kanban column totals)
// -----------------------------------------------------------------------------
const getByStage = async (req, res) => {
  try {
    const filter = getBaseFilter(req.query);

    const pipeline = [];
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    pipeline.push({
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
        totalValue: { $sum: "$amountBase" },
      },
    });

    const stageStats = await Lead.aggregate(pipeline);

    // Make sure EVERY stage is included in order, even if count is 0
    // This keeps the frontend Kanban board columns stable and predictable
    const stages = STAGE_LIST.map((stageName) => {
      const match = stageStats.find((s) => s._id === stageName);
      return {
        stage: stageName,
        count: match ? match.count : 0,
        totalValue: match ? Math.round(match.totalValue * 100) / 100 : 0,
      };
    });

    res.json({ success: true, stages });
  } catch (err) {
    console.error("getByStage error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 3. GET /api/dashboard/by-country
// Returns lead count + amountBase grouped by country (for pie/bar charts)
// -----------------------------------------------------------------------------
const getByCountry = async (req, res) => {
  try {
    const filter = getBaseFilter(req.query);

    const pipeline = [];
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    pipeline.push(
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 },
          totalValue: { $sum: "$amountBase" },
        },
      },
      { $sort: { totalValue: -1 } },
      {
        $project: {
          _id: 0,
          country: "$_id",
          count: 1,
          totalValue: { $round: ["$totalValue", 2] },
        },
      }
    );

    const countries = await Lead.aggregate(pipeline);

    res.json({ success: true, countries });
  } catch (err) {
    console.error("getByCountry error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 4. GET /api/dashboard/lost-reasons
// Returns counts of why deals were lost (for post-mortem / improvements)
// -----------------------------------------------------------------------------
const getLostReasons = async (req, res) => {
  try {
    const filter = getBaseFilter(req.query);

    // Only look at Closed Lost leads with a non-empty lostReason
    const match = {
      ...filter,
      stage: STAGES.CLOSED_LOST,
      lostReason: { $exists: true, $ne: "" },
    };

    const lostReasons = await Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$lostReason",
          count: { $sum: 1 },
          totalValue: { $sum: "$amountBase" },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          reason: "$_id",
          count: 1,
          totalValue: { $round: ["$totalValue", 2] },
        },
      },
    ]);

    res.json({ success: true, lostReasons });
  } catch (err) {
    console.error("getLostReasons error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 5. GET /api/dashboard/rep-performance
// Returns leaderboard: leads count, won/lost, open value, won value per rep
// -----------------------------------------------------------------------------
const getRepPerformance = async (req, res) => {
  try {
    const performance = await Lead.aggregate([
      // Group leads by their owner (rep)
      {
        $group: {
          _id: "$owner",
          totalLeads: { $sum: 1 },
          openLeads: {
            $sum: {
              $cond: [{ $not: [{ $in: ["$stage", CLOSED_STAGES] }] }, 1, 0],
            },
          },
          openValue: {
            $sum: {
              $cond: [
                { $not: [{ $in: ["$stage", CLOSED_STAGES] }] },
                "$amountBase",
                0,
              ],
            },
          },
          wonCount: {
            $sum: {
              $cond: [{ $eq: ["$stage", STAGES.CLOSED_WON] }, 1, 0],
            },
          },
          wonValue: {
            $sum: {
              $cond: [{ $eq: ["$stage", STAGES.CLOSED_WON] }, "$amountBase", 0],
            },
          },
          lostCount: {
            $sum: {
              $cond: [{ $eq: ["$stage", STAGES.CLOSED_LOST] }, 1, 0],
            },
          },
        },
      },

      // Join with the users collection to get rep name, email, avatar, role
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "rep",
        },
      },

      // Flatten the array created by $lookup
      {
        $unwind: {
          path: "$rep",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Shape the final output cleanly
      {
        $project: {
          _id: 0,
          repId: "$_id",
          name: { $ifNull: ["$rep.name", "Unassigned"] },
          email: { $ifNull: ["$rep.email", ""] },
          role: { $ifNull: ["$rep.role", "rep"] },
          avatar: { $ifNull: ["$rep.avatar", ""] },
          totalLeads: 1,
          openLeads: 1,
          openValue: { $round: ["$openValue", 2] },
          wonCount: 1,
          wonValue: { $round: ["$wonValue", 2] },
          lostCount: 1,
          // Win rate percentage
          winRate: {
            $cond: [
              { $gt: [{ $add: ["$wonCount", "$lostCount"] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$wonCount",
                          { $add: ["$wonCount", "$lostCount"] },
                        ],
                      },
                      100,
                    ],
                  },
                  1,
                ],
              },
              0,
            ],
          },
        },
      },

      // Leaderboard ranking: highest wonValue first, then openValue
      { $sort: { wonValue: -1, openValue: -1 } },
    ]);

    res.json({ success: true, performance });
  } catch (err) {
    console.error("getRepPerformance error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// -----------------------------------------------------------------------------
// 6. GET /api/dashboard/rates
// Returns live/cached USD-based exchange rates for currency display switching
// -----------------------------------------------------------------------------
const getExchangeRates = async (req, res) => {
  try {
    const rates = await getRates();
    res.json({ success: true, base: "USD", rates });
  } catch (err) {
    console.error("getExchangeRates error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  getSummary,
  getByStage,
  getByCountry,
  getLostReasons,
  getRepPerformance,
  getExchangeRates,
};
