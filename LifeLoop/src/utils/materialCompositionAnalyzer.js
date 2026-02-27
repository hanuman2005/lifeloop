// src/utils/materialCompositionAnalyzer.js
// 🚀 ADVANCED MATERIAL COMPOSITION ANALYZER

import * as mobilenet from "@tensorflow-models/mobilenet";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

/**
 * MATERIAL KNOWLEDGE BASE
 * Maps item categories to their likely material compositions
 */
const MATERIAL_DATABASE = {
  // Electronics
  laptop: {
    materials: [
      {
        name: "Lithium-ion Battery",
        percentage: 15,
        hazard: "high",
        recyclable: true,
      },
      { name: "ABS Plastic", percentage: 35, hazard: "low", recyclable: true },
      {
        name: "Aluminum Alloy",
        percentage: 25,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Copper Wiring",
        percentage: 10,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Rare Earth Elements",
        percentage: 5,
        hazard: "medium",
        recyclable: true,
      },
      { name: "Glass (LCD)", percentage: 10, hazard: "low", recyclable: false },
    ],
    recyclingComplexity: "high",
    specialInstructions:
      "Remove battery before recycling. Contains valuable rare earth metals.",
    eWasteCategory: "Large IT Equipment",
  },

  "cell phone": {
    materials: [
      {
        name: "Lithium Polymer Battery",
        percentage: 20,
        hazard: "high",
        recyclable: true,
      },
      {
        name: "Gorilla Glass",
        percentage: 15,
        hazard: "low",
        recyclable: false,
      },
      {
        name: "Aluminum Frame",
        percentage: 25,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Gold (Circuit Boards)",
        percentage: 2,
        hazard: "low",
        recyclable: true,
      },
      { name: "Copper", percentage: 15, hazard: "low", recyclable: true },
      {
        name: "Plastic (Various)",
        percentage: 23,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "medium",
    specialInstructions: "High value in precious metals. Donate if functional.",
    eWasteCategory: "Small IT Equipment",
  },

  // Plastics
  "water bottle": {
    materials: [
      {
        name: "PET Plastic (#1)",
        percentage: 95,
        hazard: "low",
        recyclable: true,
      },
      { name: "HDPE Cap (#2)", percentage: 5, hazard: "low", recyclable: true },
    ],
    recyclingComplexity: "low",
    specialInstructions:
      "Rinse before recycling. Remove cap if different plastic type.",
    plasticType: "PET",
    recyclingCode: 1,
  },

  "plastic bag": {
    materials: [
      {
        name: "LDPE Plastic (#4)",
        percentage: 100,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "low",
    specialInstructions:
      "Not accepted in curbside recycling. Return to grocery store drop-off.",
    plasticType: "LDPE",
    recyclingCode: 4,
  },

  // Textiles
  jeans: {
    materials: [
      { name: "Cotton Denim", percentage: 70, hazard: "low", recyclable: true },
      {
        name: "Polyester Blend",
        percentage: 25,
        hazard: "low",
        recyclable: false,
      },
      {
        name: "Metal Rivets/Buttons",
        percentage: 5,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "medium",
    specialInstructions:
      "Donate if wearable. Can be repurposed into insulation.",
    textileType: "Cotton-Blend",
  },

  // Glass
  "wine bottle": {
    materials: [
      {
        name: "Soda-lime Glass",
        percentage: 95,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Cork/Synthetic Cork",
        percentage: 3,
        hazard: "low",
        recyclable: false,
      },
      {
        name: "Aluminum Foil Cap",
        percentage: 2,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "low",
    specialInstructions:
      "Remove cap and rinse. Glass is infinitely recyclable.",
    glassType: "Soda-lime",
    glassColor: "varies",
  },

  // Batteries
  battery: {
    materials: [
      { name: "Lithium", percentage: 30, hazard: "high", recyclable: true },
      { name: "Cobalt", percentage: 20, hazard: "high", recyclable: true },
      { name: "Nickel", percentage: 15, hazard: "medium", recyclable: true },
      { name: "Graphite", percentage: 15, hazard: "low", recyclable: true },
      { name: "Aluminum", percentage: 10, hazard: "low", recyclable: true },
      {
        name: "Plastic Casing",
        percentage: 10,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "high",
    specialInstructions:
      "NEVER throw in trash! Fire hazard. Take to specialized e-waste facility.",
    eWasteCategory: "Batteries",
    dangerLevel: "CRITICAL",
  },

  // Furniture
  chair: {
    materials: [
      {
        name: "Hardwood (Oak/Maple)",
        percentage: 60,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Foam Padding",
        percentage: 20,
        hazard: "low",
        recyclable: false,
      },
      {
        name: "Fabric Upholstery",
        percentage: 15,
        hazard: "low",
        recyclable: true,
      },
      {
        name: "Metal Screws/Brackets",
        percentage: 5,
        hazard: "low",
        recyclable: true,
      },
    ],
    recyclingComplexity: "medium",
    specialInstructions:
      "Donate if usable. Disassemble for material-specific recycling.",
    furnitureType: "Wood",
  },
};

/**
 * Fallback material analysis based on category keywords
 */
const CATEGORY_TO_MATERIALS = {
  // Electronics keywords
  electronics: [
    "Lithium-ion Battery",
    "Circuit Boards",
    "Copper Wiring",
    "Plastic Casing",
  ],
  phone: [
    "Lithium Polymer Battery",
    "Gorilla Glass",
    "Aluminum",
    "Precious Metals",
  ],
  computer: [
    "Lithium-ion Battery",
    "ABS Plastic",
    "Aluminum",
    "Copper",
    "Rare Earths",
  ],

  // Plastic keywords
  plastic: ["PET Plastic", "HDPE", "PP Polypropylene"],
  bottle: ["PET Plastic (#1)", "HDPE Cap (#2)"],
  container: ["PP Polypropylene (#5)"],

  // Glass keywords
  glass: ["Soda-lime Glass"],

  // Metal keywords
  metal: ["Steel", "Aluminum", "Copper"],
  aluminum: ["Aluminum Alloy"],

  // Textile keywords
  clothing: ["Cotton", "Polyester", "Synthetic Fibers"],
  fabric: ["Cotton", "Polyester Blend"],

  // Paper keywords
  paper: ["Recycled Paper Fiber", "Cardboard"],
  cardboard: ["Corrugated Cardboard", "Paper Pulp"],
};

/**
 * Advanced Material Composition Analyzer
 * Uses multiple AI models + knowledge base to identify materials
 */
export class MaterialCompositionAnalyzer {
  constructor() {
    this.mobileNetModel = null;
    this.cocoSsdModel = null;
    this.isReady = false;
  }

  /**
   * Initialize AI models
   */
  async initialize() {
    try {
      console.log("🤖 Loading AI models for material analysis...");

      // Load MobileNet for classification
      this.mobileNetModel = await mobilenet.load();

      // Load COCO-SSD for object detection
      this.cocoSsdModel = await cocoSsd.load();

      this.isReady = true;
      console.log("✅ Material analyzer ready!");

      return true;
    } catch (error) {
      console.error("❌ Error loading models:", error);
      return false;
    }
  }

  /**
   * Analyze image to extract material composition
   * @param {HTMLImageElement} image - Image element
   * @returns {Promise<Object>} Material analysis results
   */
  async analyze(image) {
    if (!this.isReady) {
      throw new Error("Models not initialized. Call initialize() first.");
    }

    try {
      // Step 1: Get object classification from MobileNet
      const predictions = await this.mobileNetModel.classify(image);
      const topPrediction = predictions[0];

      console.log("🔍 Classification:", topPrediction.className);

      // Step 2: Detect objects with COCO-SSD for additional context
      const detections = await this.cocoSsdModel.detect(image);

      console.log(
        "📦 Detected objects:",
        detections.map((d) => d.class)
      );

      // Step 3: Extract materials from knowledge base
      const materials = this.extractMaterials(
        topPrediction.className,
        detections
      );

      // Step 4: Calculate environmental metrics
      const environmentalImpact = this.calculateEnvironmentalImpact(materials);

      // Step 5: Generate recycling recommendations
      const recyclingRecommendations =
        this.generateRecyclingRecommendations(materials);

      // Step 6: Identify hazardous materials
      const hazards = this.identifyHazards(materials);

      return {
        success: true,
        primaryObject: topPrediction.className,
        confidence: (topPrediction.probability * 100).toFixed(1),
        detectedObjects: detections.map((d) => ({
          class: d.class,
          confidence: (d.score * 100).toFixed(1),
          bbox: d.bbox,
        })),
        materials: materials.materials || [],
        recyclingComplexity: materials.recyclingComplexity,
        specialInstructions: materials.specialInstructions,
        environmentalImpact,
        recyclingRecommendations,
        hazards,
        eWasteCategory: materials.eWasteCategory,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Material analysis error:", error);
      throw error;
    }
  }

  /**
   * Extract material composition from knowledge base
   */
  extractMaterials(className, detections) {
    const normalizedName = className.toLowerCase();

    // Direct match in database
    if (MATERIAL_DATABASE[normalizedName]) {
      return MATERIAL_DATABASE[normalizedName];
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(MATERIAL_DATABASE)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return value;
      }
    }

    // Fallback to category-based analysis
    for (const [category, materials] of Object.entries(CATEGORY_TO_MATERIALS)) {
      if (normalizedName.includes(category)) {
        return {
          materials: materials.map((name) => ({
            name,
            percentage: Math.round(100 / materials.length),
            hazard: "unknown",
            recyclable: true,
          })),
          recyclingComplexity: "medium",
          specialInstructions:
            "Check local recycling guidelines for specific instructions.",
        };
      }
    }

    // Generic fallback
    return {
      materials: [
        {
          name: "Mixed Materials",
          percentage: 100,
          hazard: "unknown",
          recyclable: true,
        },
      ],
      recyclingComplexity: "unknown",
      specialInstructions:
        "Unable to determine specific materials. Please consult local recycling guidelines.",
    };
  }

  /**
   * Calculate environmental impact metrics
   */
  calculateEnvironmentalImpact(materials) {
    const recyclableMaterials =
      materials.materials?.filter((m) => m.recyclable) || [];
    const recyclablePercentage = recyclableMaterials.reduce(
      (sum, m) => sum + m.percentage,
      0
    );

    const highHazardMaterials =
      materials.materials?.filter((m) => m.hazard === "high") || [];

    return {
      recyclablePercentage,
      co2SavedByRecycling: this.estimateCO2Savings(materials),
      landfillDiversionPotential:
        recyclablePercentage > 70
          ? "High"
          : recyclablePercentage > 40
          ? "Medium"
          : "Low",
      valueRecoveryPotential: this.estimateValueRecovery(materials),
      requiresSpecialHandling: highHazardMaterials.length > 0,
    };
  }

  /**
   * Estimate CO2 savings from recycling
   */
  estimateCO2Savings(materials) {
    const CO2_SAVINGS_PER_KG = {
      Aluminum: 9.0, // kg CO2 per kg material
      Plastic: 1.5,
      Glass: 0.3,
      Paper: 2.0,
      Steel: 1.8,
      Copper: 5.0,
      Battery: 10.0,
    };

    // Estimate based on material types
    let totalSavings = 0;
    materials.materials?.forEach((material) => {
      for (const [type, savings] of Object.entries(CO2_SAVINGS_PER_KG)) {
        if (material.name.toLowerCase().includes(type.toLowerCase())) {
          // Assume 1kg item weight for estimation
          totalSavings += savings * (material.percentage / 100);
        }
      }
    });

    return totalSavings > 0 ? totalSavings.toFixed(2) : 1.5; // Default estimate
  }

  /**
   * Estimate value recovery potential
   */
  estimateValueRecovery(materials) {
    const valuableMaterials = [
      "gold",
      "silver",
      "copper",
      "aluminum",
      "lithium",
      "cobalt",
      "rare earth",
    ];

    const hasValuableMaterials = materials.materials?.some((m) =>
      valuableMaterials.some((vm) => m.name.toLowerCase().includes(vm))
    );

    if (hasValuableMaterials) {
      return "High - Contains valuable recyclable materials";
    }

    return materials.recyclingComplexity === "low"
      ? "Medium - Standard recyclable materials"
      : "Low";
  }

  /**
   * Generate detailed recycling recommendations
   */
  generateRecyclingRecommendations(materials) {
    const recommendations = [];

    materials.materials?.forEach((material) => {
      if (material.hazard === "high") {
        recommendations.push({
          priority: "CRITICAL",
          material: material.name,
          action: "Take to specialized e-waste/hazardous waste facility",
          reason: "Fire/environmental hazard if disposed improperly",
        });
      } else if (material.recyclable && material.percentage > 20) {
        recommendations.push({
          priority: "HIGH",
          material: material.name,
          action: "Recycle through appropriate channel",
          reason: `Major component (${material.percentage}%) - high environmental value`,
        });
      }
    });

    // Add special instructions
    if (materials.specialInstructions) {
      recommendations.push({
        priority: "INFO",
        material: "General",
        action: materials.specialInstructions,
        reason: "Manufacturer/industry recommendation",
      });
    }

    return recommendations;
  }

  /**
   * Identify hazardous materials
   */
  identifyHazards(materials) {
    const hazards = {
      hasHazardousMaterials: false,
      criticalHazards: [],
      mediumHazards: [],
      handlingInstructions: [],
    };

    materials.materials?.forEach((material) => {
      if (material.hazard === "high") {
        hazards.hasHazardousMaterials = true;
        hazards.criticalHazards.push({
          material: material.name,
          warning: "Do NOT dispose in regular trash",
          risk: "Fire hazard, toxic if damaged",
        });
      } else if (material.hazard === "medium") {
        hazards.mediumHazards.push({
          material: material.name,
          warning: "Handle with care",
          risk: "Potential environmental contamination",
        });
      }
    });

    if (materials.dangerLevel === "CRITICAL") {
      hazards.handlingInstructions.push(
        "Store in cool, dry place away from flammable materials"
      );
      hazards.handlingInstructions.push(
        "If damaged, do not touch - call hazardous waste hotline"
      );
    }

    return hazards;
  }
}

/**
 * Singleton instance
 */
let analyzerInstance = null;

/**
 * Get analyzer instance (lazy initialization)
 */
export const getMaterialAnalyzer = async () => {
  if (!analyzerInstance) {
    analyzerInstance = new MaterialCompositionAnalyzer();
    await analyzerInstance.initialize();
  }
  return analyzerInstance;
};

/**
 * Quick analysis function for easy use
 */
export const analyzeMaterialComposition = async (image) => {
  const analyzer = await getMaterialAnalyzer();
  return await analyzer.analyze(image);
};
