// Tests for schedule-check.js - Watering schedule logic

// Mock dependencies before requiring the module
jest.mock('../netlify/functions/lib/db', () => ({
  listDuePlants: jest.fn(),
  updatePlant: jest.fn()
}));

jest.mock('../netlify/functions/lib/messaging', () => ({
  personaMessage: jest.fn(),
  waterNowMessage: jest.fn()
}));

jest.mock('node-fetch', () => jest.fn());

jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
const { personaMessage, waterNowMessage } = require('../netlify/functions/lib/messaging');
const fetch = require('node-fetch');
const twilio = require('twilio');

describe('schedule-check', () => {
  let handler;
  let mockTwilioClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset module cache to get fresh mocks
    jest.resetModules();
    
    // Re-mock after reset
    jest.mock('../netlify/functions/lib/db', () => ({
      listDuePlants: jest.fn(),
      updatePlant: jest.fn()
    }));
    
    jest.mock('../netlify/functions/lib/messaging', () => ({
      personaMessage: jest.fn(),
      waterNowMessage: jest.fn()
    }));
    
    jest.mock('node-fetch', () => jest.fn());
    
    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'SM_test_123' })
      }
    };
    
    jest.mock('twilio', () => jest.fn(() => mockTwilioClient));
    
    // Now require the handler
    handler = require('../netlify/functions/schedule-check').handler;
  });

  describe('getUnitsForCountry helper', () => {
    it('should return imperial for US', () => {
      // Test through the handler behavior
      // US users should get Fahrenheit
    });

    it('should return metric for non-US countries', () => {
      // Non-US users should get Celsius
    });
  });

  describe('No plants due', () => {
    it('should return processed: 0 when no plants are due', async () => {
      const { listDuePlants } = require('../netlify/functions/lib/db');
      listDuePlants.mockResolvedValue([]);

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).processed).toBe(0);
    });
  });

  describe('Plants due for watering', () => {
    it('should send SMS to due plants', async () => {
      const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
      const { personaMessage } = require('../netlify/functions/lib/messaging');
      const fetch = require('node-fetch');
      
      const mockPlant = {
        id: 'plant_123',
        nickname: 'Fernie',
        species: 'Fern',
        phone_e164: '+15551234567',
        personality: 'sassy',
        country: 'Canada',
        lat: 43.65,
        lon: -79.38,
        skip_soil_check: false,
        slot_index: 0,
        language: 'en'
      };

      listDuePlants.mockResolvedValue([mockPlant]);
      updatePlant.mockResolvedValue({});
      personaMessage.mockResolvedValue('Hey! Time to check on Fernie!');
      
      // Mock weather API
      fetch.mockResolvedValue({
        json: () => Promise.resolve({
          main: { temp: 20 },
          weather: [{ main: 'Clear' }]
        })
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).processed).toBe(1);
      expect(listDuePlants).toHaveBeenCalled();
      expect(personaMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          personality: 'sassy',
          nickname: 'Fernie',
          species: 'Fern'
        })
      );
    });

    it('should skip soil check when skip_soil_check is true', async () => {
      const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
      const { waterNowMessage } = require('../netlify/functions/lib/messaging');
      
      const mockPlant = {
        id: 'plant_123',
        nickname: 'Fernie',
        species: 'Fern',
        phone_e164: '+15551234567',
        personality: 'zen',
        skip_soil_check: true,
        slot_index: 0,
        language: 'en'
      };

      listDuePlants.mockResolvedValue([mockPlant]);
      updatePlant.mockResolvedValue({});
      waterNowMessage.mockReturnValue('Time to water Fernie!');

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      expect(waterNowMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          personality: 'zen',
          nickname: 'Fernie'
        })
      );
      // Should clear the skip flag
      expect(updatePlant).toHaveBeenCalledWith('plant_123', { skip_soil_check: false });
    });

    it('should update next_due_ts after processing', async () => {
      const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
      const { personaMessage } = require('../netlify/functions/lib/messaging');
      
      const mockPlant = {
        id: 'plant_456',
        nickname: 'Leafy',
        species: 'Pothos',
        phone_e164: '+15559876543',
        personality: 'formal',
        skip_soil_check: false,
        slot_index: 1,
        language: 'en'
      };

      listDuePlants.mockResolvedValue([mockPlant]);
      updatePlant.mockResolvedValue({});
      personaMessage.mockResolvedValue('Good day. Please check Leafy.');

      await handler({});

      // Should update next_due_ts to +1 hour
      expect(updatePlant).toHaveBeenCalledWith(
        'plant_456',
        expect.objectContaining({
          next_due_ts: expect.any(Number)
        })
      );
    });
  });

  describe('Weather API integration', () => {
    it('should fetch weather for plants with lat/lon', async () => {
      const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
      const { personaMessage } = require('../netlify/functions/lib/messaging');
      const fetch = require('node-fetch');
      
      const mockPlant = {
        id: 'plant_789',
        nickname: 'Sunny',
        species: 'Sunflower',
        phone_e164: '+15551112222',
        personality: 'cheerful',
        country: 'US',
        lat: 40.71,
        lon: -74.01,
        skip_soil_check: false,
        slot_index: 0,
        language: 'en'
      };

      listDuePlants.mockResolvedValue([mockPlant]);
      updatePlant.mockResolvedValue({});
      personaMessage.mockResolvedValue('Sunny day for Sunny!');
      
      fetch.mockResolvedValue({
        json: () => Promise.resolve({
          main: { temp: 75 },
          weather: [{ main: 'Sunny' }]
        })
      });

      await handler({});

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org')
      );
      // US should use imperial units
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('units=imperial')
      );
    });

    it('should handle weather API failure gracefully', async () => {
      const { listDuePlants, updatePlant } = require('../netlify/functions/lib/db');
      const { personaMessage } = require('../netlify/functions/lib/messaging');
      const fetch = require('node-fetch');
      
      const mockPlant = {
        id: 'plant_999',
        nickname: 'Cloudy',
        species: 'Ivy',
        phone_e164: '+15553334444',
        personality: 'zen',
        lat: 51.51,
        lon: -0.13,
        skip_soil_check: false,
        slot_index: 0,
        language: 'en'
      };

      listDuePlants.mockResolvedValue([mockPlant]);
      updatePlant.mockResolvedValue({});
      personaMessage.mockResolvedValue('Check on Cloudy please.');
      
      // Weather API fails
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await handler({});

      // Should still succeed - weather is optional
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).processed).toBe(1);
    });
  });

  describe('Invocation source logging', () => {
    it('should identify HTTP invocation', async () => {
      const { listDuePlants } = require('../netlify/functions/lib/db');
      listDuePlants.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log');
      
      await handler({ httpMethod: 'GET' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTP')
      );
    });

    it('should identify scheduled invocation', async () => {
      const { listDuePlants } = require('../netlify/functions/lib/db');
      listDuePlants.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log');
      
      await handler({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SCHEDULED')
      );
    });
  });
});
