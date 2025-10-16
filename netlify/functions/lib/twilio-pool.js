// netlify/functions/lib/twilio-pool.js
// Twilio number pool for multi-plant support
// Each user can have up to 5 plants, each with its own slot number

const TWILIO_POOL = [
  process.env.TWILIO_SLOT_1 || process.env.TWILIO_FROM_NUMBER, // Fallback to main number for slot 1
  process.env.TWILIO_SLOT_2,
  process.env.TWILIO_SLOT_3,
  process.env.TWILIO_SLOT_4,
  process.env.TWILIO_SLOT_5,
];

const MAX_PLANTS_PER_USER = 5;

/**
 * Get Twilio number for a specific slot (0-4)
 * @param {number} slotIndex - Plant slot index (0-4)
 * @returns {string} Twilio phone number
 */
function getSlotNumber(slotIndex) {
  if (slotIndex < 0 || slotIndex >= MAX_PLANTS_PER_USER) {
    throw new Error(`Invalid slot index: ${slotIndex}. Must be 0-${MAX_PLANTS_PER_USER - 1}`);
  }
  
  const number = TWILIO_POOL[slotIndex];
  if (!number) {
    throw new Error(`Twilio number not configured for slot ${slotIndex + 1}. Set TWILIO_SLOT_${slotIndex + 1} in environment variables.`);
  }
  
  return number;
}

/**
 * Get slot index from Twilio number
 * @param {string} twilioNumber - Twilio phone number
 * @returns {number} Slot index (0-4) or -1 if not found
 */
function getSlotIndex(twilioNumber) {
  return TWILIO_POOL.indexOf(twilioNumber);
}

/**
 * Get all configured slot numbers
 * @returns {string[]} Array of Twilio numbers
 */
function getAllSlotNumbers() {
  return TWILIO_POOL.filter(num => num !== undefined && num !== null);
}

/**
 * Check if a number is in the pool
 * @param {string} number - Phone number to check
 * @returns {boolean}
 */
function isPoolNumber(number) {
  return TWILIO_POOL.includes(number);
}

module.exports = {
  getSlotNumber,
  getSlotIndex,
  getAllSlotNumbers,
  isPoolNumber,
  MAX_PLANTS_PER_USER,
  TWILIO_POOL
};
