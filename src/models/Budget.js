const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  monthlyIncome: { type: Number, required: true, min: 0 },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Budget', budgetSchema);
