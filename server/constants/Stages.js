// The 8 Kanban pipeline stages, in order.
// This is the ONLY place where stage names are defined.
// Import STAGES or STAGE_LIST everywhere — never type stage strings by hand.

const STAGES = {
  NEW:                "New",
  CONTACTED:          "Contacted",
  QUALIFIED:          "Qualified",
  PROPOSAL_SENT:      "Proposal Sent",
  NEGOTIATION:        "Negotiation",
  IN_CONTRACT_REVIEW: "In Contract Review",
  CLOSED_WON:         "Closed Won",
  CLOSED_LOST:        "Closed Lost",
};

// An array of the stage strings — useful for Mongoose enums and validation
const STAGE_LIST = Object.values(STAGES);

// Stages where a deal is considered finished (no more movement expected)
const CLOSED_STAGES = [STAGES.CLOSED_WON, STAGES.CLOSED_LOST];

module.exports = { STAGES, STAGE_LIST, CLOSED_STAGES };
