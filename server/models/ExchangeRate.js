const mongoose = require("mongoose");


const exchangeRateSchema = new mongoose.Schema({
  base: { type: String, default: "USD" }, 
  rates: { type: Map, of: Number, required: true },

  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
