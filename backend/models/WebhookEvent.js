const mongoose = require('mongoose');

// Stores processed webhook events to ensure idempotency
// Unique constraints prevent double-processing on retries
const webhookEventSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: ['stripe', 'flutterwave'] },
  eventId: { type: String, required: true }, // Stripe: event.id, Flutterwave: transaction id
  tx_ref: { type: String }, // Flutterwave primary linkage (optional)
  meta: { type: Object },
}, {
  timestamps: true
});

webhookEventSchema.index({ source: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ tx_ref: 1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);