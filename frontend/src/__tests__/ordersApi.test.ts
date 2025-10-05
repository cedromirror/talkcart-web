import { api } from '../lib/api';

// Mock the fetch function
global.fetch = jest.fn();

describe('Orders API', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should call the correct endpoint for canceling orders', async () => {
    // Mock the response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Call the cancelOrder method
    await api.orders.cancelOrder('test-order-id');

    // Check that fetch was called with the correct URL and method
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders/test-order-id/cancel'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should call the correct endpoint for getting payment history', async () => {
    // Mock the response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    // Call the getPaymentHistory method
    await api.payments.getPaymentHistory();

    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/history'),
      expect.any(Object)
    );
  });
});