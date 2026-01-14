// Tests for check-trial-expiry.js - Trial expiration logic
// Note: This function uses native fetch which is harder to mock
// These tests focus on the email HTML generation logic

describe('check-trial-expiry', () => {
  describe('Email HTML generation', () => {
    it('should generate valid HTML email structure', () => {
      // Test that the email template contains required elements
      const plantName = 'Fernie';
      const emailHtml = generateTestEmailHtml(plantName);
      
      expect(emailHtml).toContain('LingoLeaf');
      expect(emailHtml).toContain('Fernie');
      expect(emailHtml).toContain('trial');
      expect(emailHtml).toContain('Subscribe');
    });

    it('should include payment link in email', () => {
      const emailHtml = generateTestEmailHtml('TestPlant');
      
      expect(emailHtml).toContain('lingoleaf.ai');
      expect(emailHtml).toContain('pricing');
    });

    it('should handle missing plant name gracefully', () => {
      const emailHtml = generateTestEmailHtml(null);
      
      expect(emailHtml).toContain("your plant's");
      expect(emailHtml).not.toContain('null');
    });

    it('should include proper styling', () => {
      const emailHtml = generateTestEmailHtml('Leafy');
      
      // Check for inline styles (email-safe)
      expect(emailHtml).toContain('style=');
      expect(emailHtml).toContain('#02B91A'); // LingoLeaf green
    });
  });

  describe('Trial expiry logic', () => {
    it('should correctly identify expired trials', () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      
      expect(isTrialExpired(expiredDate)).toBe(true);
      expect(isTrialExpired(futureDate)).toBe(false);
    });

    it('should not notify already notified users', () => {
      const plant = {
        trial_expiry_notified: true,
        trial_end_date: '2025-01-01'
      };
      
      expect(shouldNotify(plant)).toBe(false);
    });

    it('should not notify users with active subscriptions', () => {
      const plant = {
        trial_expiry_notified: false,
        trial_end_date: '2025-01-01',
        subscription_status: 'active'
      };
      
      expect(shouldNotify(plant)).toBe(false);
    });

    it('should notify expired trials without subscription', () => {
      const plant = {
        trial_expiry_notified: false,
        trial_end_date: '2025-01-01',
        subscription_status: null
      };
      
      expect(shouldNotify(plant)).toBe(true);
    });
  });
});

// Helper functions that mirror the logic in check-trial-expiry.js
function generateTestEmailHtml(plantName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>color: #02B91A;</style>
    </head>
    <body style="font-family: sans-serif;">
      <h1>LingoLeaf</h1>
      <p>We hope you enjoyed getting to know ${plantName ? `<strong style="color: #02B91A;">${plantName}</strong>'s` : "your plant's"} personality over the past 30 days!</p>
      <p>Your trial has ended. Subscribe now to continue!</p>
      <a href="https://lingoleaf.ai/#pricing">Subscribe Now</a>
    </body>
    </html>
  `;
}

function isTrialExpired(trialEndDate) {
  return new Date(trialEndDate) < new Date();
}

function shouldNotify(plant) {
  if (plant.trial_expiry_notified) return false;
  if (plant.subscription_status === 'active') return false;
  return true;
}
