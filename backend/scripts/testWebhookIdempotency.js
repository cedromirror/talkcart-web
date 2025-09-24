/*
  Seed/Test Script: Webhook Idempotency Verification
  - Inserts sample WebhookEvent records for Stripe and Flutterwave
  - Verifies unique (source, eventId) constraint prevents duplicates
  - Prints a compact summary of results and recent entries

  Usage:
    MONGODB_URI="mongodb://localhost:27017/talkcart" npm run test:webhook-idempotency
*/

require('dotenv').config();
const mongoose = require('mongoose');

// Import model directly to avoid relying on full model index if tree changes
const WebhookEvent = require('../models/WebhookEvent');

async function connect() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(process.env.MONGODB_URI);
}

async function tryInsert(doc) {
  try {
    const r = await WebhookEvent.create(doc);
    return { ok: true, id: r._id.toString() };
  } catch (e) {
    // Duplicate key error code in MongoDB is 11000
    if (e && (e.code === 11000 || /duplicate key/i.test(e.message))) {
      return { ok: false, duplicate: true, msg: 'Duplicate prevented by unique index' };
    }
    return { ok: false, error: e.message };
  }
}

async function run() {
  console.log('▶️  Webhook Idempotency Test Script');
  console.log('DB:', process.env.MONGODB_URI);

  await connect();
  console.log('✅ Connected');

  // Use unique IDs per run while sharing same (source,eventId) to trigger duplicates
  const now = Date.now();

  const stripeEventId = 'evt_test_idem_001';
  const stripeDoc = { source: 'stripe', eventId: stripeEventId, meta: { type: 'payment_intent.succeeded', at: now } };

  const flwTxId = '100000-test-idem-001';
  const flwTxRef = 'txref_test_001';
  const flwDoc = { source: 'flutterwave', eventId: flwTxId, tx_ref: flwTxRef, meta: { event: 'charge.completed', at: now } };

  console.log('\n— Stripe —');
  const s1 = await tryInsert(stripeDoc);
  console.log('First insert:', s1);
  const s2 = await tryInsert(stripeDoc); // duplicate attempt
  console.log('Second insert (dup):', s2);

  console.log('\n— Flutterwave —');
  const f1 = await tryInsert(flwDoc);
  console.log('First insert:', f1);
  const f2 = await tryInsert(flwDoc); // duplicate attempt
  console.log('Second insert (dup):', f2);

  // Fetch recent events for quick inspection
  const recent = await WebhookEvent.find({
    source: { $in: ['stripe', 'flutterwave'] },
    eventId: { $in: [stripeEventId, flwTxId] }
  }).sort({ createdAt: -1 }).lean();

  console.log('\nRecent matching events:');
  for (const ev of recent) {
    console.log({ _id: ev._id.toString(), source: ev.source, eventId: ev.eventId, tx_ref: ev.tx_ref, createdAt: ev.createdAt });
  }

  // Optional cleanup flag SUPPORT: set REMOVE_TEST_EVENTS=true to delete created docs
  if (process.env.REMOVE_TEST_EVENTS === 'true') {
    const del = await WebhookEvent.deleteMany({ eventId: { $in: [stripeEventId, flwTxId] } });
    console.log(`\n🧹 Cleanup removed: ${del.deletedCount}`);
  }

  await mongoose.connection.close();
  console.log('\n✅ Done');
}

run().catch(async (err) => {
  console.error('❌ Test failed:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});