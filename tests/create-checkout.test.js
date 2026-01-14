// Tests for create-checkout.js - Stripe checkout flow

// Mock Stripe before requiring the module
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn()
      }
    }
  }));
});

const Stripe = require('stripe');
const { handler } = require('../netlify/functions/create-checkout');

describe('create-checkout', () => {
  let mockStripeInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStripeInstance = Stripe.mock.results[0]?.value || {
      checkout: {
        sessions: {
          create: jest.fn()
        }
      }
    };
    Stripe.mockImplementation(() => mockStripeInstance);
  });

  describe('CORS handling', () => {
    it('should return 200 for OPTIONS preflight request', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    });
  });

  describe('HTTP method validation', () => {
    it('should return 405 for GET requests', async () => {
      const event = { httpMethod: 'GET' };
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body).error).toBe('Method not allowed');
    });

    it('should return 405 for PUT requests', async () => {
      const event = { httpMethod: 'PUT' };
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
    });
  });

  describe('Input validation', () => {
    it('should return 400 if email is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ userId: '123' })
      };
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe('Email is required');
    });

    it('should return 400 if body is empty', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({})
      };
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error).toBe('Email is required');
    });
  });

  describe('Successful checkout', () => {
    it('should create Stripe checkout session with valid email', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          userId: 'user_123',
          plantId: 'plant_456'
        })
      };

      // Re-require to get fresh instance with mock
      jest.resetModules();
      jest.mock('stripe', () => jest.fn(() => mockStripeInstance));
      const { handler: freshHandler } = require('../netlify/functions/create-checkout');

      const result = await freshHandler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.sessionId).toBe('cs_test_123');
      expect(body.url).toBe('https://checkout.stripe.com/test');
    });

    it('should include CORS headers in successful response', async () => {
      const mockSession = { id: 'cs_test_123', url: 'https://checkout.stripe.com/test' };
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      jest.resetModules();
      jest.mock('stripe', () => jest.fn(() => mockStripeInstance));
      const { handler: freshHandler } = require('../netlify/functions/create-checkout');

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      };

      const result = await freshHandler(event);

      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Error handling', () => {
    it('should return 500 if Stripe throws an error', async () => {
      mockStripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      jest.resetModules();
      jest.mock('stripe', () => jest.fn(() => mockStripeInstance));
      const { handler: freshHandler } = require('../netlify/functions/create-checkout');

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@example.com' })
      };

      const result = await freshHandler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).error).toBe('Stripe API error');
    });

    it('should return 500 for invalid JSON body', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });
  });
});
