const mongoose = require("mongoose");
const { STAGE_LIST, STAGES } = require("../constants/Stages");


const COUNTRIES = ["India", "USA", "UK", "Canada", "UAE"];


const CURRENCIES = ["INR", "USD", "GBP", "CAD", "AED"];


const leadSchema = new mongoose.Schema(
  {
    
    name:    { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: "" },
    email:   { type: String, lowercase: true, trim: true, default: "" },
    phone:   { type: String, trim: true, default: "" },

    
    country:  { type: String, enum: COUNTRIES, required: true },
    currency: { type: String, enum: CURRENCIES, required: true },

    amount: { type: Number, default: 0, min: 0 },

    
    amountBase: { type: Number, default: 0, min: 0 },

    // Which stage of the Kanban pipeline this lead is in
    stage: {
      type: String,
      enum: STAGE_LIST,
      default: STAGES.NEW,
    },

    // The sales rep responsible for this lead (references the User collection)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Only filled in when stage === "Closed Lost" — explains why we lost
    lostReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// These make search and filter queries fast once the collection grows large.
leadSchema.index({ name: "text", company: "text", email: "text", phone: "text" }); // full-text search
leadSchema.index({ stage: 1 });    // fast Kanban board queries
leadSchema.index({ owner: 1 });    // fast "my leads" filter
leadSchema.index({ country: 1 });  // fast country filter
leadSchema.index({ currency: 1 }); // fast currency filter

module.exports = mongoose.model("Lead", leadSchema);

// Export the allowed lists so controllers can use them for validation
module.exports.COUNTRIES = COUNTRIES;
module.exports.CURRENCIES = CURRENCIES;
