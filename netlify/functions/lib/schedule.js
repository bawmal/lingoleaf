// netlify/functions/lib/schedule.js
// LingoLeaf Scheduling & Knowledge Base (50 species)
// Exports: KB, computeAdjustedHours, nextDueFrom, applyCalibration

// --------------------------- Knowledge Base ---------------------------
// base = recommended hours between waterings in active season
// winter = multiplier applied during Nov–Mar (extends interval)
// 80 plants with botanical names and precise watering schedules
const KB = {
  "Pothos (Golden/Neon)": { base: 168, winter: 2.5 },
  "Snake Plant": { base: 336, winter: 4.0 },
  "Monstera Deliciosa": { base: 216, winter: 2.0 },
  "ZZ Plant": { base: 420, winter: 3.0 },
  "Fiddle Leaf Fig": { base: 168, winter: 2.0 },
  "Spider Plant": { base: 144, winter: 2.5 },
  "Peace Lily": { base: 108, winter: 2.0 },
  "Cactus (General)": { base: 504, winter: 5.0 },
  "Succulent (General)": { base: 336, winter: 4.5 },
  "Aloe Vera": { base: 336, winter: 4.0 },
  "Boston Fern": { base: 72, winter: 1.5 },
  "Maidenhair Fern": { base: 48, winter: 1.5 },
  "Calathea Orbifolia": { base: 144, winter: 2.5 },
  "Bird of Paradise": { base: 216, winter: 2.0 },
  "Rubber Tree": { base: 168, winter: 2.5 },
  "Trailing Philodendron": { base: 168, winter: 2.5 },
  "Chinese Evergreen": { base: 240, winter: 3.0 },
  "Dracaena Marginata": { base: 240, winter: 3.0 },
  "Croton": { base: 168, winter: 2.5 },
  "Polka Dot Begonia": { base: 216, winter: 2.5 },
  "String of Pearls": { base: 336, winter: 5.0 },
  "Basil (Indoor Herb)": { base: 72, winter: 1.0 },
  "Majesty Palm": { base: 96, winter: 1.5 },
  "Schefflera": { base: 240, winter: 2.5 },
  "Cast Iron Plant": { base: 336, winter: 3.0 },
  "African Violet": { base: 120, winter: 2.0 },
  "Christmas Cactus": { base: 240, winter: 3.5 },
  "Orchid (Phalaenopsis)": { base: 192, winter: 2.5 },
  "Hoya (Wax Plant)": { base: 264, winter: 3.0 },
  "English Ivy": { base: 120, winter: 2.0 },
  "Areca Palm": { base: 144, winter: 1.8 },
  "Bonsai (General)": { base: 48, winter: 1.0 },
  "Prayer Plant": { base: 108, winter: 2.0 },
  "Dumb Cane": { base: 192, winter: 2.5 },
  "Peperomia (General)": { base: 240, winter: 3.0 },
  "Cyclamen": { base: 168, winter: 1.5 },
  "Arrowhead Plant": { base: 120, winter: 2.0 },
  "Pencil Cactus": { base: 420, winter: 4.5 },
  "Hanging Fern (Pteris)": { base: 84, winter: 1.5 },
  "Croton Petra": { base: 168, winter: 2.5 },
  "Purple Oxalis": { base: 96, winter: 1.5 },
  "Money Tree": { base: 216, winter: 2.0 },
  "Alocasia Polly": { base: 120, winter: 2.2 },
  "Lemon Button Fern": { base: 72, winter: 1.5 },
  "Lithops (Living Stones)": { base: 8760, winter: 1.0 },
  "Jade Plant": { base: 420, winter: 4.5 },
  "String of Nickels": { base: 264, winter: 3.0 },
  "Dracaena Corn Plant": { base: 240, winter: 2.5 },
  "Ficus Benjamina": { base: 192, winter: 2.0 },
  "Hypoestes (Polka Dot)": { base: 120, winter: 1.8 },
  "Flaming Katy (Kalanchoe)": { base: 168, winter: 3.0 },
  "Chrysanthemum (Florist's Mum)": { base: 72, winter: 1.5 },
  "Geranium (Zonal)": { base: 96, winter: 2.0 },
  "Lavender (Indoor)": { base: 168, winter: 2.5 },
  "Rosemary (Indoor Herb)": { base: 144, winter: 2.5 },
  "Mint (Indoor Herb)": { base: 72, winter: 1.5 },
  "Parsley": { base: 96, winter: 1.5 },
  "Oregano": { base: 144, winter: 2.5 },
  "Thyme": { base: 168, winter: 3.0 },
  "Sage": { base: 168, winter: 3.0 },
  "Coleus": { base: 96, winter: 2.0 },
  "Hibiscus (Tropical)": { base: 96, winter: 1.8 },
  "Jasmine (Arabian)": { base: 120, winter: 2.0 },
  "Gardenia": { base: 96, winter: 1.8 },
  "Gerbera Daisy": { base: 96, winter: 1.8 },
  "Lavender Tree (Topiary)": { base: 168, winter: 2.5 },
  "Staghorn Fern": { base: 72, winter: 1.5 },
  "Bird's Nest Fern": { base: 96, winter: 1.8 },
  "Split-leaf Philodendron": { base: 168, winter: 2.0 },
  "Giant Alocasia": { base: 120, winter: 2.2 },
  "Banana Plant (Indoor)": { base: 96, winter: 1.8 },
  "Amaryllis": { base: 120, winter: 2.5 },
  "Easter Lily": { base: 120, winter: 2.5 },
  "Dendrobium Orchid": { base: 168, winter: 2.5 },
  "Oncidium Orchid": { base: 144, winter: 2.5 },
  "Cilantro": { base: 72, winter: 1.5 },
  "Chives": { base: 72, winter: 1.5 },
  "Dill": { base: 72, winter: 1.5 },
  "Tillandsia (Air Plant)": { base: 168, winter: 2.0 },
  "Bougainvillea": { base: 144, winter: 2.5 },
};

// --------------------- Environmental Multipliers ----------------------
// Tweak these if you find your audience skews wetter/drier environments.
const POT_MULT   = { small: 0.90, large: 1.00 };
const MAT_MULT   = { plastic: 1.00, terracotta: 0.85 };
const LIGHT_MULT = { north: 1.15, south: 0.90, east: 1.00, west: 1.00 };

function isDormant(monthIdx /*0-11*/) {
  // Nov(10)–Mar(2)
  return monthIdx === 10 || monthIdx === 11 || monthIdx === 0 || monthIdx === 1 || monthIdx === 2;
}

// Core computation
function computeAdjustedHours({ species, pot_size, pot_material, light_exposure, now = new Date() }) {
  const defaults = { base: 168, winter: 2.0 };
  const entry = KB[species] || defaults;
  const env = (POT_MULT[pot_size] || 1) * (MAT_MULT[pot_material] || 1) * (LIGHT_MULT[light_exposure] || 1);
  const adjusted = Math.round(entry.base * env);
  const effective = isDormant(now.getMonth()) ? Math.round(adjusted * entry.winter) : adjusted;
  return { base: entry.base, winter: entry.winter, adjusted, effective };
}

function nextDueFrom(lastWateredTs, effectiveHours) {
  const baseTs = lastWateredTs || Date.now();
  return baseTs + effectiveHours * 3600 * 1000;
}

// User calibration via SMS (DRY adds hours → less frequent; DAMP removes hours → more frequent)
function applyCalibration(adjustedHours, calibrationHours) {
  const result = Math.max(24, Math.round(adjustedHours + (calibrationHours || 0)));
  return result;
}

module.exports = { KB, computeAdjustedHours, nextDueFrom, applyCalibration };
