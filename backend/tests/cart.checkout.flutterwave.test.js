const request = require('supertest');
const express = require('express');

// Mock auth BEFORE loading the router under test
jest.mock('../routes/auth', () => ({
    authenticateTokenStrict: (req, _res, next) => {
        req.user = { userId: 'user123' };
        next();
    }
}));

// Under test: mock models
jest.mock('../models/Cart');
jest.mock('../models/Product');
jest.mock('../models/Order');

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Router under test
const cartRouter = require('../routes/cart');

// Mock fetch for Flutterwave verification
global.fetch = jest.fn();

function appWithRouter() {
    const app = express();
    app.use(express.json());
    app.use('/api/cart', cartRouter);
    return app;
}

beforeEach(() => {
    jest.clearAllMocks();
    // Prevent lingering timers from idempotency cleanup
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });
});

afterEach(() => {
    if (global.setTimeout.mockRestore) global.setTimeout.mockRestore();
});

function buildCart({ currency = 'USD', itemsCount = 1, groupAmount = 50, statusRecord } = {}) {
    // items have price and quantity already set on cart item for subtotal path
    const items = Array.from({ length: itemsCount }).map((_, i) => ({
        _id: `item${i}`,
        price: groupAmount / itemsCount, // distributed
        quantity: 1,
        currency,
        productId: {
            _id: `prod${i}`,
            isNFT: false,
            name: `Product ${i}`,
            currency,
            availability: 'available'
        }
    }));

    const payments = statusRecord ? [statusRecord] : [];

    const cartDoc = {
        _id: 'cart1',
        userId: 'user123',
        items,
        payments,
        totalAmount: groupAmount,
        save: jest.fn().mockResolvedValue(true),
        clearCart: jest.fn(),
        removeItem: jest.fn(),
    };
    return cartDoc;
}

function mockFindOneReturns(cartDoc) {
    Cart.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(cartDoc)
    });
}

function mockSuccessfulStockUpdate() {
    Product.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'prod0' });
}

function mockOrderCreate() {
    Order.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true), _id: 'order1', orderNumber: 'ORD-1' }));
}

function flwVerifyOk({ amount = 50, currency = 'USD', tx_ref = 'txref', id = '12345' } = {}) {
    fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'successful', amount, currency, tx_ref, id } })
    });
}

function flwVerifyFail({ status = 400, body = { message: 'fail' } } = {}) {
    fetch.mockResolvedValue({ ok: false, status, text: async () => JSON.stringify(body) });
}

function flwVerifyMismatch({ amount = 10, currency = 'USD', tx_ref = 'txref', id = '12345' } = {}) {
    fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'successful', amount, currency, tx_ref, id } })
    });
}

describe('Cart checkout - Flutterwave', () => {
    test('success: verifies per currency, decrements stock, creates order', async () => {
        const app = appWithRouter();

        const statusRecord = { provider: 'flutterwave', currency: 'USD', tx_ref: 'txref-usd-1', flw_tx_id: '1111', status: 'successful' };
        const cartDoc = buildCart({ currency: 'USD', itemsCount: 2, groupAmount: 50, statusRecord });

        mockFindOneReturns(cartDoc);
        mockSuccessfulStockUpdate();
        mockOrderCreate();
        flwVerifyOk({ amount: 50, currency: 'USD', tx_ref: 'txref-usd-1', id: '1111' });

        const res = await request(app)
            .post('/api/cart/checkout')
            .send({ paymentMethod: 'flutterwave', paymentDetails: [{ currency: 'USD', tx_ref: 'txref-usd-1', flw_tx_id: '1111' }] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(Product.findOneAndUpdate).toHaveBeenCalled();
        expect(res.body.data.processedItems.length).toBe(2);
        expect(res.body.data.orderId).toBeDefined();
    });

    test('mismatch: amount lower than expected returns 402', async () => {
        const app = appWithRouter();

        const cartDoc = buildCart({ currency: 'USD', itemsCount: 1, groupAmount: 50 });
        mockFindOneReturns(cartDoc);
        // Verification returns amount 10, expected 50 => should fail
        flwVerifyMismatch({ amount: 10, currency: 'USD', tx_ref: 'txref-usd-2', id: '2222' });

        const res = await request(app)
            .post('/api/cart/checkout')
            .send({ paymentMethod: 'flutterwave', paymentDetails: [{ currency: 'USD', tx_ref: 'txref-usd-2', flw_tx_id: '2222' }] });

        expect(res.status).toBe(402);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Payment not completed or invalid/);
    });

    test('failure: verification endpoint error returns 500', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const app = appWithRouter();

        const cartDoc = buildCart({ currency: 'USD', itemsCount: 1, groupAmount: 60 });
        mockFindOneReturns(cartDoc);
        flwVerifyFail();

        const res = await request(app)
            .post('/api/cart/checkout')
            .send({ paymentMethod: 'flutterwave', paymentDetails: [{ currency: 'USD', tx_ref: 'txref-x-3', flw_tx_id: '999' }] });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Checkout failed/);

        errorSpy.mockRestore();
    });
});