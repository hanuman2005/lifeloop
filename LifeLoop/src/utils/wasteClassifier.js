// src/utils/wasteClassifier.js

// =====================
// Material Mapping
// =====================
export const materialCategories = {
  PLASTIC: 'Plastic',
  PAPER: 'Paper/Cardboard',
  GLASS: 'Glass',
  METAL: 'Metal',
  TEXTILE: 'Cloth/Textile',
  EWASTE: 'E-Waste',
  ORGANIC: 'Organic Waste',
  OTHER: 'Other'
};

// Map MobileNet labels to waste categories
export const labelToCategory = {
  // Plastic items
  'water bottle': materialCategories.PLASTIC,
  'plastic bag': materialCategories.PLASTIC,
  'pop bottle': materialCategories.PLASTIC,
  'bottle': materialCategories.PLASTIC,
  'container': materialCategories.PLASTIC,
  'bucket': materialCategories.PLASTIC,
  'cup': materialCategories.PLASTIC,
  'milk can': materialCategories.PLASTIC,
  'jar': materialCategories.PLASTIC,
  
  // Paper/Cardboard
  'carton': materialCategories.PAPER,
  'envelope': materialCategories.PAPER,
  'book': materialCategories.PAPER,
  'notebook': materialCategories.PAPER,
  'magazine': materialCategories.PAPER,
  'paper towel': materialCategories.PAPER,
  'tissue': materialCategories.PAPER,
  'box': materialCategories.PAPER,
  'cardboard': materialCategories.PAPER,
  
  // Glass
  'beer bottle': materialCategories.GLASS,
  'wine bottle': materialCategories.GLASS,
  'vase': materialCategories.GLASS,
  
  // Metal
  'can': materialCategories.METAL,
  'beer can': materialCategories.METAL,
  'soda can': materialCategories.METAL,
  'tin can': materialCategories.METAL,
  'fork': materialCategories.METAL,
  'spoon': materialCategories.METAL,
  'knife': materialCategories.METAL,
  'spatula': materialCategories.METAL,
  
  // Textiles
  'jean': materialCategories.TEXTILE,
  'sweatshirt': materialCategories.TEXTILE,
  'jersey': materialCategories.TEXTILE,
  'shirt': materialCategories.TEXTILE,
  't-shirt': materialCategories.TEXTILE,
  'dress': materialCategories.TEXTILE,
  'coat': materialCategories.TEXTILE,
  'jacket': materialCategories.TEXTILE,
  'sweater': materialCategories.TEXTILE,
  'sock': materialCategories.TEXTILE,
  'bag': materialCategories.TEXTILE,
  'backpack': materialCategories.TEXTILE,
  'handbag': materialCategories.TEXTILE,
  'purse': materialCategories.TEXTILE,
  
  // E-Waste
  'cellular telephone': materialCategories.EWASTE,
  'mobile phone': materialCategories.EWASTE,
  'laptop': materialCategories.EWASTE,
  'notebook computer': materialCategories.EWASTE,
  'desktop computer': materialCategories.EWASTE,
  'monitor': materialCategories.EWASTE,
  'television': materialCategories.EWASTE,
  'screen': materialCategories.EWASTE,
  'remote control': materialCategories.EWASTE,
  'mouse': materialCategories.EWASTE,
  'keyboard': materialCategories.EWASTE,
  'printer': materialCategories.EWASTE,
  'camera': materialCategories.EWASTE,
  'iPod': materialCategories.EWASTE,
  'headphone': materialCategories.EWASTE,
  'earphone': materialCategories.EWASTE,
  'charger': materialCategories.EWASTE,
  'power cord': materialCategories.EWASTE,
  
  // Organic
  'banana': materialCategories.ORGANIC,
  'apple': materialCategories.ORGANIC,
  'orange': materialCategories.ORGANIC,
  'lemon': materialCategories.ORGANIC,
  'pineapple': materialCategories.ORGANIC,
  'strawberry': materialCategories.ORGANIC,
  'mushroom': materialCategories.ORGANIC,
  'broccoli': materialCategories.ORGANIC,
  'cucumber': materialCategories.ORGANIC,
  'potato': materialCategories.ORGANIC,
  'cauliflower': materialCategories.ORGANIC,
  'cabbage': materialCategories.ORGANIC,
};

/**
 * Classify waste item based on MobileNet label
 */
export const classifyWasteItem = (label) => {
  const lowerLabel = label.toLowerCase();
  
  // Direct match
  if (labelToCategory[lowerLabel]) {
    return labelToCategory[lowerLabel];
  }
  
  // Partial match
  for (const [key, category] of Object.entries(labelToCategory)) {
    if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
      return category;
    }
  }
  
  // Keyword-based fallback
  if (lowerLabel.includes('bottle') || lowerLabel.includes('plastic')) {
    return materialCategories.PLASTIC;
  }
  if (lowerLabel.includes('paper') || lowerLabel.includes('card')) {
    return materialCategories.PAPER;
  }
  if (lowerLabel.includes('glass')) {
    return materialCategories.GLASS;
  }
  if (lowerLabel.includes('metal') || lowerLabel.includes('aluminum')) {
    return materialCategories.METAL;
  }
  if (lowerLabel.includes('cloth') || lowerLabel.includes('fabric')) {
    return materialCategories.TEXTILE;
  }
  if (lowerLabel.includes('phone') || lowerLabel.includes('electronic')) {
    return materialCategories.EWASTE;
  }
  if (lowerLabel.includes('food') || lowerLabel.includes('fruit')) {
    return materialCategories.ORGANIC;
  }
  
  return materialCategories.OTHER;
};

// =====================
// Waste Advice Database
// =====================
export const wasteAdvice = {
  [materialCategories.PLASTIC]: {
    reuseIdeas: [
      'DIY planter for small plants',
      'Storage container for small items',
      'Bird feeder for your garden',
      'Pencil holder for desk organization'
    ],
    upcycleIdeas: [
      'Cut and create decorative hanging pots',
      'Make a watering can with holes in cap'
    ],
    recyclingGuidance: 'Rinse thoroughly and place in plastic recycling bin. Remove caps if possible. Check for recycling symbol (#1 PETE or #2 HDPE are most recyclable).',
    donationPossible: false,
    donationCategory: null,
  },
  
  [materialCategories.PAPER]: {
    reuseIdeas: [
      'Scrap paper for notes and sketches',
      'Gift wrapping paper',
      'Paper mache crafts',
      'Compost material (non-glossy only)'
    ],
    upcycleIdeas: [
      'Make handmade paper or cards',
      'Create origami decorations'
    ],
    recyclingGuidance: 'Flatten boxes and remove any plastic tape. Place in paper/cardboard bin. Avoid recycling if greasy or wet.',
    donationPossible: true,
    donationCategory: 'books',
  },
  
  [materialCategories.GLASS]: {
    reuseIdeas: [
      'Vase for flowers',
      'Storage jar for pantry items',
      'Candle holder',
      'Drinking glass (if clean)'
    ],
    upcycleIdeas: [
      'Paint and decorate as decorative piece',
      'Create a terrarium'
    ],
    recyclingGuidance: 'Rinse clean and place in glass recycling. Remove metal lids. Broken glass should be wrapped carefully.',
    donationPossible: true,
    donationCategory: 'household-items',
  },
  
  [materialCategories.METAL]: {
    reuseIdeas: [
      'Use as small containers',
      'Create organizers',
      'Garden tool holder',
      'Scrap for art projects'
    ],
    upcycleIdeas: [
      'Tin can planters (drill drainage holes)',
      'Metal art sculptures'
    ],
    recyclingGuidance: 'Rinse cans and remove labels. Aluminum cans are 100% recyclable. Place in metal recycling bin.',
    donationPossible: false,
    donationCategory: null,
  },
  
  [materialCategories.TEXTILE]: {
    reuseIdeas: [
      'Cleaning rags from old clothes',
      'Donate wearable items',
      'Pet bedding material',
      'Craft fabric for projects'
    ],
    upcycleIdeas: [
      'Patchwork quilts or bags',
      'Braided rugs from fabric strips'
    ],
    recyclingGuidance: 'Donate wearable clothes to charity. Torn items can go to textile recycling centers. Never throw in regular trash.',
    donationPossible: true,
    donationCategory: 'clothing',
  },
  
  [materialCategories.EWASTE]: {
    reuseIdeas: [
      'Backup device if functional',
      'Donate to schools/NGOs',
      'Repurpose as media player',
      'Use for parts salvage'
    ],
    upcycleIdeas: [
      'Digital photo frame from old tablet',
      'Security camera from old phone'
    ],
    recyclingGuidance: 'NEVER throw in regular trash! Take to e-waste collection center. Remove batteries. Factory reset devices before recycling.',
    donationPossible: true,
    donationCategory: 'electronics',
  },
  
  [materialCategories.ORGANIC]: {
    reuseIdeas: [
      'Compost for garden fertilizer',
      'Animal feed (check safety)',
      'Make natural dyes',
      'Mulch for plants'
    ],
    upcycleIdeas: [
      'Vermicompost with worms',
      'Biogas production (community level)'
    ],
    recyclingGuidance: 'Compost at home or use municipal organic waste bins. Banana peels, fruit scraps make excellent fertilizer.',
    donationPossible: false,
    donationCategory: null,
  },
  
  [materialCategories.OTHER]: {
    reuseIdeas: [
      'Find creative uses at home',
      'Check with local recycling center',
      'Ask community for ideas',
      'Donate if in good condition'
    ],
    upcycleIdeas: [
      'Art and craft projects',
      'DIY home decor'
    ],
    recyclingGuidance: 'Check with your local waste management authority for proper disposal methods.',
    donationPossible: true,
    donationCategory: 'other',
  },
};

/**
 * Get waste advice for a category
 */
export const getWasteAdvice = (category) => {
  return wasteAdvice[category] || wasteAdvice[materialCategories.OTHER];
};

// =====================
// Impact Calculations
// =====================
export const impactData = {
  [materialCategories.PLASTIC]: {
    carbonSaved: 2.5,
    wasteDiverted: 0.5,
    ecoScore: 25,
  },
  [materialCategories.PAPER]: {
    carbonSaved: 1.8,
    wasteDiverted: 0.3,
    ecoScore: 20,
  },
  [materialCategories.GLASS]: {
    carbonSaved: 0.8,
    wasteDiverted: 0.6,
    ecoScore: 15,
  },
  [materialCategories.METAL]: {
    carbonSaved: 3.5,
    wasteDiverted: 0.4,
    ecoScore: 30,
  },
  [materialCategories.TEXTILE]: {
    carbonSaved: 5.0,
    wasteDiverted: 1.2,
    ecoScore: 40,
  },
  [materialCategories.EWASTE]: {
    carbonSaved: 15.0,
    wasteDiverted: 2.0,
    ecoScore: 80,
  },
  [materialCategories.ORGANIC]: {
    carbonSaved: 0.5,
    wasteDiverted: 0.8,
    ecoScore: 10,
  },
  [materialCategories.OTHER]: {
    carbonSaved: 1.0,
    wasteDiverted: 0.5,
    ecoScore: 15,
  },
};

/**
 * Calculate environmental impact
 */
export const calculateEcoImpact = (category) => {
  return impactData[category] || impactData[materialCategories.OTHER];
};

// =====================
// User-Friendly Messages
// =====================
export const motivationalMessages = [
  "🌍 This is reusable! You're making a difference!",
  "✨ Every small action counts toward a better planet!",
  "🎉 You just saved the planet a little bit!",
  "💚 Sustainability hero in action!",
  "🌱 Your choice helps reduce waste!",
  "⭐ Amazing! Keep up the eco-friendly work!",
  "🏆 You're a waste reduction champion!",
  "🌟 Small steps, big impact!",
];

export const getRandomMotivation = () => {
  return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
};