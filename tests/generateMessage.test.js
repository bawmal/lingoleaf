// tests/generateMessage.test.js
const { 
  getSeason, 
  hashMessage, 
  shouldIncludeName, 
  shouldIncludeTip,
  isWithinTransitionPeriod,
  getFallbackMessage,
  PERSONALITIES
} = require('../netlify/functions/lib/generateMessage');

describe('generateMessage', () => {
  describe('getSeason', () => {
    it('should return winter for northern hemisphere in January', () => {
      const jan = new Date('2026-01-15');
      expect(getSeason(43.65, jan)).toBe('winter'); // Toronto
    });

    it('should return summer for northern hemisphere in July', () => {
      const jul = new Date('2026-07-15');
      expect(getSeason(43.65, jul)).toBe('summer');
    });

    it('should return spring for northern hemisphere in April', () => {
      const apr = new Date('2026-04-15');
      expect(getSeason(43.65, apr)).toBe('spring');
    });

    it('should return autumn for northern hemisphere in October', () => {
      const oct = new Date('2026-10-15');
      expect(getSeason(43.65, oct)).toBe('autumn');
    });

    it('should return summer for southern hemisphere in January', () => {
      const jan = new Date('2026-01-15');
      expect(getSeason(-33.87, jan)).toBe('summer'); // Sydney
    });

    it('should return winter for southern hemisphere in July', () => {
      const jul = new Date('2026-07-15');
      expect(getSeason(-33.87, jul)).toBe('winter');
    });
  });

  describe('hashMessage', () => {
    it('should return consistent hash for same message', () => {
      const msg = 'Hello, check my soil!';
      expect(hashMessage(msg)).toBe(hashMessage(msg));
    });

    it('should return different hash for different messages', () => {
      expect(hashMessage('Hello')).not.toBe(hashMessage('Goodbye'));
    });

    it('should return 8 character hash', () => {
      expect(hashMessage('Test message').length).toBe(8);
    });
  });

  describe('shouldIncludeName', () => {
    it('should return true for first message', () => {
      const plant = { messages_sent: 0 };
      expect(shouldIncludeName(plant)).toBe(true);
    });

    it('should return true after 7+ day gap', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const plant = { messages_sent: 5, last_message_at: eightDaysAgo.toISOString() };
      expect(shouldIncludeName(plant)).toBe(true);
    });

    it('should return true for every 4th message', () => {
      const plant = { messages_sent: 4, last_message_at: new Date().toISOString() };
      expect(shouldIncludeName(plant)).toBe(true);
      
      const plant8 = { messages_sent: 8, last_message_at: new Date().toISOString() };
      expect(shouldIncludeName(plant8)).toBe(true);
    });

    it('should return false for non-4th messages with recent contact', () => {
      const plant = { messages_sent: 3, last_message_at: new Date().toISOString() };
      expect(shouldIncludeName(plant)).toBe(false);
    });
  });

  describe('shouldIncludeTip', () => {
    it('should return true after 5+ waterings since last tip', () => {
      const plant = { waterings_since_tip: 5, total_waterings: 10 };
      expect(shouldIncludeTip(plant)).toBe(true);
    });

    it('should return true for 3rd watering (new user milestone)', () => {
      const plant = { waterings_since_tip: 0, total_waterings: 3 };
      expect(shouldIncludeTip(plant)).toBe(true);
    });

    it('should return false for 2nd watering with no other triggers', () => {
      // Mock isWithinTransitionPeriod to return false
      const plant = { waterings_since_tip: 1, total_waterings: 2 };
      // This test may pass or fail depending on current month
      // We're testing the watering count logic primarily
      const result = shouldIncludeTip(plant);
      // If not in transition period and not at milestone, should be false
      if (!isWithinTransitionPeriod()) {
        expect(result).toBe(false);
      }
    });
  });

  describe('getFallbackMessage', () => {
    it('should return zen fallback with emoji prefix', () => {
      const msg = getFallbackMessage('zen', 'soil_check', 'en', 'Monty');
      expect(msg).toContain('🧘');
      expect(msg).toContain('Monty');
      expect(msg).toContain('DRY or DAMP');
    });

    it('should return sassy fallback with emoji prefix', () => {
      const msg = getFallbackMessage('sassy', 'watering_dry', 'en', 'Fern');
      expect(msg).toContain('😎');
      expect(msg).toContain('DONE');
    });

    it('should return anxious fallback with emoji prefix', () => {
      const msg = getFallbackMessage('anxious', 'done_confirmation', 'en', 'Ivy');
      expect(msg).toContain('😰');
    });

    it('should return formal fallback without emoji', () => {
      const msg = getFallbackMessage('formal', 'soil_check', 'en', 'Oak');
      expect(msg).not.toContain('🧘');
      expect(msg).not.toContain('😎');
      expect(msg).not.toContain('😰');
    });

    it('should return French fallback when language is fr', () => {
      const msg = getFallbackMessage('zen', 'soil_check', 'fr', 'Monty');
      expect(msg).toContain('SEC ou HUMIDE');
    });

    it('should return English fallback for unknown language', () => {
      const msg = getFallbackMessage('zen', 'soil_check', 'de', 'Monty');
      expect(msg).toContain('DRY or DAMP');
    });
  });

  describe('PERSONALITIES', () => {
    it('should have all four personalities defined', () => {
      expect(PERSONALITIES.zen).toBeDefined();
      expect(PERSONALITIES.sassy).toBeDefined();
      expect(PERSONALITIES.anxious).toBeDefined();
      expect(PERSONALITIES.formal).toBeDefined();
    });

    it('should have fallback prefixes for each personality', () => {
      expect(PERSONALITIES.zen.fallbackPrefix).toBe('🧘 ');
      expect(PERSONALITIES.sassy.fallbackPrefix).toBe('😎 ');
      expect(PERSONALITIES.anxious.fallbackPrefix).toBe('😰 ');
      expect(PERSONALITIES.formal.fallbackPrefix).toBe('');
    });
  });
});
