// Test setup - runs before all tests
// Set up environment variables for testing
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_PRICE_ID = 'price_test_mock';
process.env.URL = 'https://lingoleaf.ai';
process.env.TWILIO_ACCOUNT_SID = 'AC_test_mock';
process.env.TWILIO_AUTH_TOKEN = 'auth_test_mock';
process.env.TWILIO_FROM_NUMBER = '+15551234567';
process.env.OWM_API_KEY = 'owm_test_mock';
process.env.DB_URL = 'https://test.supabase.co';
process.env.DB_API_KEY = 'test_api_key';
process.env.RESEND_API_KEY = 're_test_mock';

// Silence console logs during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
// };
