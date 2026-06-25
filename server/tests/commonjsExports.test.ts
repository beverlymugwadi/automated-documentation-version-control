/**
 * Regression tests for:
 *   Fix 1 — CommonJS export recognition (exports.X, module.exports.X, module.exports = {})
 *   Fix 3 — @desc / @route / @access tag parsing from consecutive // comments
 *   Fix 4 — Express handler API surface (req.body / req.params / req.query / res.status)
 *   Fix 6 — No Configuration section when no env vars are present
 */
import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/services/astParser';
import { compose } from '../src/services/docComposer';

// ── The booking controller described in the spec ─────────────────────────────
const BOOKING_CONTROLLER = `
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Product = require('../models/Product');
const io = require('../utils/socket');

const getIO = () => io.getIO();

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private (vendors only)
exports.createBooking = asyncHandler(async (req, res) => {
  const { product, quantity, vendor, vendorName } = req.body;
  const booking = await Booking.create({ product, quantity, vendor, vendorName, customer: req.user._id });
  res.status(201).json({ success: true, data: booking });
});

// @desc    Get all bookings for a user
// @route   GET /api/bookings
// @access  Private
exports.getBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id });
  res.status(200).json({ success: true, data: bookings });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  res.status(200).json({ success: true, data: booking });
});

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (farmers and vendors)
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Not found' });

  const valid = ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  if (status === 'confirmed') {
    await Product.findByIdAndUpdate(booking.product, { $inc: { availableQuantity: -booking.quantity } });
  }
  if (status === 'cancelled' && booking.status === 'confirmed') {
    await Product.findByIdAndUpdate(booking.product, { $inc: { availableQuantity: booking.quantity } });
  }

  booking.status = status;
  await booking.save();

  const io2 = getIO();
  io2.to(\`user_\${booking.customer}\`).emit('booking:statusUpdated', { bookingId: booking._id, status });

  res.status(200).json({ success: true, data: booking });
});

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Private (vendors only)
exports.getBookingStats = asyncHandler(async (req, res) => {
  const stats = await Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  res.status(200).json({ success: true, data: stats });
});

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
  await booking.remove();
  res.status(200).json({ success: true, message: 'Booking removed' });
});
`;

describe('Fix 1 — CommonJS export recognition', () => {
  const parsed = parseFile('bookingController.js', BOOKING_CONTROLLER);

  it('extracts all 7 declared units (6 exports + 1 internal)', () => {
    const names = parsed.functions.map((f) => f.name);
    expect(names).toContain('getIO');
    expect(names).toContain('createBooking');
    expect(names).toContain('getBookings');
    expect(names).toContain('getBooking');
    expect(names).toContain('updateBookingStatus');
    expect(names).toContain('getBookingStats');
    expect(names).toContain('deleteBooking');
    expect(parsed.functions.length).toBe(7);
  });

  it('marks exports.X functions as exported', () => {
    const createBooking = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(createBooking.exported).toBe(true);
  });

  it('marks the internal const as NOT exported', () => {
    const getIO = parsed.functions.find((f) => f.name === 'getIO')!;
    expect(getIO.exported).toBe(false);
  });

  it('detects async flag correctly', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(fn.async).toBe(true);
  });

  it('includes all exported names in exports list', () => {
    const exportedNames = parsed.exports.map((e) => e.name);
    expect(exportedNames).toContain('createBooking');
    expect(exportedNames).toContain('updateBookingStatus');
    expect(exportedNames).toContain('deleteBooking');
  });
});

describe('Fix 3 — @route / @access / @desc tag parsing', () => {
  const parsed = parseFile('bookingController.js', BOOKING_CONTROLLER);

  it('parses @route from consecutive // line comments', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(fn.jsdoc?.route).toBeDefined();
    expect(fn.jsdoc?.route?.method).toBe('POST');
    expect(fn.jsdoc?.route?.path).toBe('/api/bookings');
  });

  it('parses @access tag', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(fn.jsdoc?.access).toMatch(/vendors only/i);
  });

  it('parses @desc as the function description', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(fn.jsdoc?.description).toMatch(/Create a booking/i);
  });

  it('parses DELETE route correctly', () => {
    const fn = parsed.functions.find((f) => f.name === 'deleteBooking')!;
    expect(fn.jsdoc?.route?.method).toBe('DELETE');
  });

  it('includes access level in the rule-based output heading', () => {
    const { markdown } = compose({ title: 'Booking', notes: '', files: [{ name: 'bookingController.js', content: BOOKING_CONTROLLER }] });
    expect(markdown).toMatch(/POST \/api\/bookings/);
    expect(markdown).toMatch(/vendors only/i);
  });
});

describe('Fix 4 — Express handler API surface', () => {
  const parsed = parseFile('bookingController.js', BOOKING_CONTROLLER);

  it('extracts req.body fields for createBooking', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    expect(fn.expressApi).toBeDefined();
    expect(fn.expressApi!.bodyFields).toContain('product');
    expect(fn.expressApi!.bodyFields).toContain('quantity');
    expect(fn.expressApi!.bodyFields).toContain('vendor');
    expect(fn.expressApi!.bodyFields).toContain('vendorName');
  });

  it('extracts req.params.id for getBooking', () => {
    const fn = parsed.functions.find((f) => f.name === 'getBooking')!;
    expect(fn.expressApi?.routeParams).toContain('id');
  });

  it('detects 201 response in createBooking', () => {
    const fn = parsed.functions.find((f) => f.name === 'createBooking')!;
    const r201 = fn.expressApi?.responses.find((r) => r.status === 201);
    expect(r201).toBeDefined();
    expect(r201?.shape).toMatch(/success/);
  });

  it('detects 404 response in getBooking', () => {
    const fn = parsed.functions.find((f) => f.name === 'getBooking')!;
    const r404 = fn.expressApi?.responses.find((r) => r.status === 404);
    expect(r404).toBeDefined();
  });

  it('does NOT render (req, res, next) as Parameters in rule-based output', () => {
    const { markdown } = compose({ title: 'Booking', notes: '', files: [{ name: 'bookingController.js', content: BOOKING_CONTROLLER }] });
    // The params table should NOT have req / res / next as rows
    expect(markdown).not.toMatch(/\| `req`/);
    expect(markdown).not.toMatch(/\| `res`/);
  });

  it('renders req.body fields in rule-based output', () => {
    const { markdown } = compose({ title: 'Booking', notes: '', files: [{ name: 'bookingController.js', content: BOOKING_CONTROLLER }] });
    expect(markdown).toMatch(/Request body/i);
    expect(markdown).toMatch(/`product`/);
    expect(markdown).toMatch(/`quantity`/);
  });
});

describe('Fix 6 — No Configuration section when no env vars', () => {
  it('omits the Configuration section when no process.env usage', () => {
    const { markdown } = compose({
      title: 'Booking',
      notes: '',
      files: [{ name: 'bookingController.js', content: BOOKING_CONTROLLER }],
    });
    // The booking controller reads no process.env vars
    expect(markdown).not.toMatch(/## Configuration/);
    expect(markdown).not.toMatch(/\| Variable \|/);
  });

  it('includes Configuration section only when env vars ARE present', () => {
    const WITH_ENV = `
      const secret = process.env.JWT_SECRET;
      const dbUrl = process.env.DB_URL;
      exports.handler = async (req, res) => { res.json({ ok: true }); };
    `;
    const { markdown } = compose({ title: 'Test', notes: '', files: [{ name: 'test.js', content: WITH_ENV }] });
    expect(markdown).toMatch(/## Configuration/);
    expect(markdown).toMatch(/JWT_SECRET/);
    expect(markdown).toMatch(/DB_URL/);
  });
});

// ── module.exports.X and module.exports = {} patterns ────────────────────────
const MODULE_EXPORTS_PATTERNS = `
module.exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).json(user);
};

module.exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true });
};

module.exports = {
  createUser: async (req, res) => {
    const { name, email } = req.body;
    res.status(201).json({ name, email });
  },
  listUsers: async (req, res) => {
    res.status(200).json([]);
  },
};
`;

describe('Fix 1 — module.exports.X and module.exports = {} patterns', () => {
  const parsed = parseFile('userController.js', MODULE_EXPORTS_PATTERNS);

  it('recognises module.exports.NAME = fn', () => {
    const names = parsed.functions.map((f) => f.name);
    expect(names).toContain('getUser');
    expect(names).toContain('deleteUser');
  });

  it('recognises module.exports = { name: fn } inline functions', () => {
    const names = parsed.functions.map((f) => f.name);
    expect(names).toContain('createUser');
    expect(names).toContain('listUsers');
  });

  it('extracts body fields from module.exports = {} inline handler', () => {
    const fn = parsed.functions.find((f) => f.name === 'createUser')!;
    expect(fn.expressApi?.bodyFields).toContain('name');
    expect(fn.expressApi?.bodyFields).toContain('email');
  });
});
