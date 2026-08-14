// Presentation metadata for the nine material classes.
//
// The classifier returns material, confidence, reasoning, isRecyclable and urgency.
// This file adds only what the API cannot: colour, icon and the longer disposal
// guidance shown under the result. Keep the keys in sync with MATERIAL_CLASSES in
// ml/wasteml/config.py and MATERIAL_RULES in backend/controllers/aiController.js.

export const MATERIAL_GUIDE = {
  Plastic: {
    icon: "🧴",
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    disposal: "Rinse and dry, then keep with dry recyclables. A kabadiwala will take clean bottles and containers.",
    reuse: ["Storage jars for grains or spices", "Seedling planters", "Bird feeders"],
  },
  Glass: {
    icon: "🍶",
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    disposal: "Keep separate so it does not shatter into other waste. Broken glass should be wrapped before disposal.",
    reuse: ["Storage jars", "Vases and candle holders", "Return deposit bottles to the shop"],
  },
  Metal: {
    icon: "🥫",
    tone: "text-slate-700 bg-slate-100 border-slate-300",
    disposal: "Scrap metal has genuine resale value. Rinse cans and sell to a kabadiwala rather than binning them.",
    reuse: ["Planters and organisers", "Tool and nail storage"],
  },
  Paper: {
    icon: "📄",
    tone: "text-amber-800 bg-amber-50 border-amber-200",
    disposal: "Keep dry — wet or food-stained paper cannot be recycled and belongs with wet waste.",
    reuse: ["Rough notebooks", "Wrapping and packing material", "Paper mache"],
  },
  Organic: {
    icon: "🍃",
    tone: "text-green-700 bg-green-50 border-green-200",
    disposal: "Compost it. This decomposes fast and must not sit mixed with dry waste, which is what ruins segregation.",
    reuse: ["Home compost", "Feed for cattle where appropriate", "Citrus peel cleaner"],
  },
  Electronic: {
    icon: "🔌",
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    disposal: "E-waste. Take it to an authorised collection point — never a household bin.",
    reuse: ["Repair or donate if working", "Recover cables and chargers", "Certified e-waste recycler"],
  },
  Textile: {
    icon: "👕",
    tone: "text-pink-700 bg-pink-50 border-pink-200",
    disposal: "If it is still wearable, donating beats recycling. Worn cloth becomes cleaning rags.",
    reuse: ["Donate wearable clothing", "Cleaning rags", "Patchwork and bags"],
  },
  Wood: {
    icon: "🪵",
    tone: "text-yellow-800 bg-yellow-50 border-yellow-200",
    disposal: "Untreated wood can be reused or composted. Painted or treated wood cannot and needs separate disposal.",
    reuse: ["Furniture repair", "Garden stakes", "Firewood if untreated"],
  },
  Hazardous: {
    icon: "⚠️",
    tone: "text-red-700 bg-red-50 border-red-200",
    disposal: "Do not bin this. It needs a designated hazardous-waste drop-off point — batteries and tube lights leach into groundwater.",
    reuse: ["Return batteries to a collection box", "Authorised hazardous waste facility"],
  },
};

export const URGENCY_LABEL = {
  low: "Not urgent",
  medium: "Deal with soon",
  high: "Deal with today",
};
