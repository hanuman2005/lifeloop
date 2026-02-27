// backend/services/mobilenetClassifier.js
// ✅ Runs MobileNet locally — no API key needed
// ✅ Maps ImageNet classes → waste categories
// ✅ Uses pure JavaScript TensorFlow (no native build tools required)
// Install: npm install @tensorflow/tfjs @tensorflow-models/mobilenet

let tf, mobilenet, model;

// ─── Lazy load TensorFlow (heavy — load once on first use) ────────────────
const loadModel = async () => {
  if (model) return model; // already loaded
  console.log("🧠 Loading MobileNet model (first time only)...");
  tf = require("@tensorflow/tfjs");
  mobilenet = require("@tensorflow-models/mobilenet");
  model = await mobilenet.load({ version: 2, alpha: 1.0 });
  console.log("✅ MobileNet loaded and ready (pure JS backend)");
  return model;
};

// ─── ImageNet class → Waste category mapping ──────────────────────────────
// MobileNet returns ImageNet labels — we map them to our 8 waste categories
// Covers: labs, classrooms, student items, household items
const CLASS_MAP = {
  // ── PLASTIC ──────────────────────────────────────────────────────────────
  "water bottle": { category: "Plastic", label: "Plastic Water Bottle" },
  "pop bottle": { category: "Plastic", label: "Plastic Soda Bottle" },
  "plastic bag": { category: "Plastic", label: "Plastic Bag" },
  bottle: { category: "Plastic", label: "Plastic Bottle" },
  bucket: { category: "Plastic", label: "Plastic Bucket" },
  "milk can": { category: "Plastic", label: "Plastic Container" },
  "pill bottle": { category: "Plastic", label: "Plastic Pill Bottle" },
  "soap dispenser": { category: "Plastic", label: "Plastic Dispenser" },
  // Student / Classroom / Household plastics
  ballpoint: { category: "Plastic", label: "Pen" },
  pen: { category: "Plastic", label: "Pen" },
  "fountain pen": { category: "Plastic", label: "Pen" },
  highlighter: { category: "Plastic", label: "Highlighter Pen" },
  marker: { category: "Plastic", label: "Marker Pen" },
  eraser: { category: "Plastic", label: "Eraser" },
  "rubber eraser": { category: "Plastic", label: "Eraser" },
  "pencil sharpener": { category: "Plastic", label: "Pencil Sharpener" },
  "water jug": { category: "Plastic", label: "Plastic Water Jug" },
  tray: { category: "Plastic", label: "Plastic Tray" },
  "Petri dish": { category: "Plastic", label: "Plastic Petri Dish" },
  "measuring cup": { category: "Plastic", label: "Plastic Measuring Cup" },
  "tennis ball": { category: "Plastic", label: "Tennis Ball" },
  "ping-pong ball": { category: "Plastic", label: "Ping Pong Ball" },
  "plate rack": { category: "Plastic", label: "Plastic Plate Rack" },
  crate: { category: "Plastic", label: "Plastic Crate" },
  "trash can": { category: "Plastic", label: "Plastic Dustbin" },
  wastebasket: { category: "Plastic", label: "Plastic Dustbin" },
  tub: { category: "Plastic", label: "Plastic Tub" },
  ladle: { category: "Plastic", label: "Plastic Ladle" },
  strainer: { category: "Plastic", label: "Plastic Strainer" },
  // Lab plastics
  syringe: { category: "Plastic", label: "Plastic Syringe" },
  mask: { category: "Plastic", label: "Face Mask" },
  "swimming cap": { category: "Plastic", label: "Plastic Cap" },
  "shower cap": { category: "Plastic", label: "Plastic Cap" },

  // ── GLASS ────────────────────────────────────────────────────────────────
  "beer bottle": { category: "Glass", label: "Glass Beer Bottle" },
  "wine bottle": { category: "Glass", label: "Glass Wine Bottle" },
  "beer glass": { category: "Glass", label: "Glass Cup" },
  "cocktail shaker": { category: "Glass", label: "Glass Container" },
  perfume: { category: "Glass", label: "Glass Perfume Bottle" },
  carboy: { category: "Glass", label: "Glass Jar" },
  // Lab / Household glass
  beaker: { category: "Glass", label: "Lab Beaker" },
  "test tube": { category: "Glass", label: "Lab Test Tube" },
  "Erlenmeyer flask": { category: "Glass", label: "Lab Flask" },
  flask: { category: "Glass", label: "Lab Flask" },
  vase: { category: "Glass", label: "Glass Vase" },
  goblet: { category: "Glass", label: "Glass Goblet" },
  "wine glass": { category: "Glass", label: "Wine Glass" },
  "drinking glass": { category: "Glass", label: "Drinking Glass" },
  "magnifying glass": { category: "Glass", label: "Magnifying Glass" },
  "lamp shade": { category: "Glass", label: "Glass Lamp Shade" },
  "fish bowl": { category: "Glass", label: "Glass Fish Bowl" },
  mirror: { category: "Glass", label: "Glass Mirror" },
  "window shade": { category: "Glass", label: "Glass Window" },
  hourglass: { category: "Glass", label: "Glass Hourglass" },
  binoculars: { category: "Glass", label: "Binoculars" },
  loupe: { category: "Glass", label: "Magnifying Loupe" },
  monocle: { category: "Glass", label: "Monocle" },
  "lab coat": { category: "Textile", label: "Lab Coat" },
  goggles: { category: "Plastic", label: "Safety Goggles" },

  // ── METAL ────────────────────────────────────────────────────────────────
  "can opener": { category: "Metal", label: "Metal Can" },
  "tin can": { category: "Metal", label: "Tin Can" },
  iron: { category: "Metal", label: "Metal Iron" },
  hammer: { category: "Metal", label: "Metal Tool" },
  wrench: { category: "Metal", label: "Metal Wrench" },
  padlock: { category: "Metal", label: "Metal Lock" },
  nail: { category: "Metal", label: "Metal Nails" },
  chain: { category: "Metal", label: "Metal Chain" },
  "safety pin": { category: "Metal", label: "Metal Pin" },
  // Watches / Jewelry / Accessories
  "digital watch": { category: "Electronic", label: "Digital Watch" },
  "analog clock": { category: "Metal", label: "Analog Watch" },
  "digital clock": { category: "Electronic", label: "Digital Clock" },
  "wall clock": { category: "Electronic", label: "Wall Clock" },
  watch: { category: "Metal", label: "Watch" },
  stopwatch: { category: "Electronic", label: "Stopwatch" },
  necklace: { category: "Metal", label: "Necklace" },
  ring: { category: "Metal", label: "Ring" },
  bracelet: { category: "Metal", label: "Bracelet" },
  sunglasses: { category: "Metal", label: "Sunglasses" },
  sunglass: { category: "Metal", label: "Sunglasses" },
  // Kitchen / Household metal
  "frying pan": { category: "Metal", label: "Metal Frying Pan" },
  wok: { category: "Metal", label: "Metal Wok" },
  pan: { category: "Metal", label: "Metal Pan" },
  pot: { category: "Metal", label: "Metal Pot" },
  kettle: { category: "Metal", label: "Metal Kettle" },
  spatula: { category: "Metal", label: "Metal Spatula" },
  knife: { category: "Metal", label: "Metal Knife" },
  cleaver: { category: "Metal", label: "Metal Cleaver" },
  spoon: { category: "Metal", label: "Metal Spoon" },
  fork: { category: "Metal", label: "Metal Fork" },
  scissors: { category: "Metal", label: "Metal Scissors" },
  corkscrew: { category: "Metal", label: "Metal Corkscrew" },
  // Lab / Tools metal
  stethoscope: { category: "Metal", label: "Stethoscope" },
  "screw driver": { category: "Metal", label: "Screwdriver" },
  screwdriver: { category: "Metal", label: "Screwdriver" },
  plunger: { category: "Metal", label: "Metal Plunger" },
  "combination lock": { category: "Metal", label: "Combination Lock" },
  scale: { category: "Metal", label: "Metal Weighing Scale" },
  dumbbell: { category: "Metal", label: "Metal Dumbbell" },
  barbell: { category: "Metal", label: "Metal Barbell" },
  hatchet: { category: "Metal", label: "Metal Hatchet" },
  "letter opener": { category: "Metal", label: "Metal Letter Opener" },
  thimble: { category: "Metal", label: "Metal Thimble" },
  compass: { category: "Metal", label: "Metal Compass" },
  "paper clip": { category: "Metal", label: "Paper Clip" },
  "binder clip": { category: "Metal", label: "Binder Clip" },
  stapler: { category: "Metal", label: "Stapler" },

  // ── PAPER / CARDBOARD ───────────────────────────────────────────────────
  envelope: { category: "Paper", label: "Paper Envelope" },
  "book jacket": { category: "Paper", label: "Paper/Cardboard" },
  "comic book": { category: "Paper", label: "Paper Book" },
  newspaper: { category: "Paper", label: "Newspaper" },
  cardboard: { category: "Paper", label: "Cardboard Box" },
  "paper towel": { category: "Paper", label: "Paper Towel" },
  // Student / Classroom paper
  binder: { category: "Paper", label: "Notebook Binder" },
  book: { category: "Paper", label: "Book" },
  packet: { category: "Paper", label: "Paper Packet" },
  menu: { category: "Paper", label: "Paper Menu" },
  letter: { category: "Paper", label: "Paper Letter" },
  "crossword puzzle": { category: "Paper", label: "Paper Puzzle" },
  "jigsaw puzzle": { category: "Paper", label: "Cardboard Puzzle" },
  "shopping cart": { category: "Paper", label: "Cardboard Box" },
  carton: { category: "Paper", label: "Paper Carton" },
  "toilet tissue": { category: "Paper", label: "Tissue Roll" },

  // ── ORGANIC ──────────────────────────────────────────────────────────────
  banana: { category: "Organic", label: "Banana Peel / Food Waste" },
  orange: { category: "Organic", label: "Orange Peel / Food Waste" },
  lemon: { category: "Organic", label: "Lemon / Food Waste" },
  broccoli: { category: "Organic", label: "Vegetable Waste" },
  cauliflower: { category: "Organic", label: "Vegetable Waste" },
  artichoke: { category: "Organic", label: "Vegetable Waste" },
  mushroom: { category: "Organic", label: "Food Waste" },
  eggnog: { category: "Organic", label: "Food Waste" },
  fig: { category: "Organic", label: "Fruit Waste" },
  strawberry: { category: "Organic", label: "Fruit Waste" },
  corn: { category: "Organic", label: "Food Waste" },
  // Extra organic
  apple: { category: "Organic", label: "Apple / Fruit Waste" },
  pineapple: { category: "Organic", label: "Pineapple / Fruit Waste" },
  cucumber: { category: "Organic", label: "Cucumber / Vegetable Waste" },
  "bell pepper": { category: "Organic", label: "Pepper / Vegetable Waste" },
  "head cabbage": { category: "Organic", label: "Cabbage / Vegetable Waste" },
  pomegranate: { category: "Organic", label: "Pomegranate / Fruit Waste" },
  "ice cream": { category: "Organic", label: "Food Waste" },
  pizza: { category: "Organic", label: "Food Waste" },
  hotdog: { category: "Organic", label: "Food Waste" },
  "French loaf": { category: "Organic", label: "Bread / Food Waste" },
  pretzel: { category: "Organic", label: "Food Waste" },
  bagel: { category: "Organic", label: "Food Waste" },
  "flower pot": { category: "Organic", label: "Potted Plant" },
  daisy: { category: "Organic", label: "Flower / Plant Waste" },
  mushroom: { category: "Organic", label: "Mushroom / Food Waste" },

  // ── ELECTRONIC ───────────────────────────────────────────────────────────
  laptop: { category: "Electronic", label: "Laptop" },
  notebook: { category: "Electronic", label: "Laptop" },
  "desktop computer": { category: "Electronic", label: "Desktop Computer" },
  "computer keyboard": { category: "Electronic", label: "Keyboard" },
  "computer mouse": { category: "Electronic", label: "Computer Mouse" },
  "space bar": { category: "Electronic", label: "Keyboard" },
  monitor: { category: "Electronic", label: "Computer Monitor" },
  screen: { category: "Electronic", label: "Computer Screen" },
  television: { category: "Electronic", label: "Television" },
  "remote control": { category: "Electronic", label: "TV Remote" },
  "mobile phone": { category: "Electronic", label: "Mobile Phone" },
  "cellular telephone": { category: "Electronic", label: "Mobile Phone" },
  "cell phone": { category: "Electronic", label: "Mobile Phone" },
  smartphone: { category: "Electronic", label: "Smartphone" },
  "hand-held computer": { category: "Electronic", label: "Tablet" },
  tablet: { category: "Electronic", label: "Tablet" },
  iPod: { category: "Electronic", label: "Music Player" },
  radio: { category: "Electronic", label: "Old Radio" },
  "cassette player": { category: "Electronic", label: "Old Cassette Player" },
  "cd player": { category: "Electronic", label: "CD Player" },
  printer: { category: "Electronic", label: "Printer" },
  "hard disc": { category: "Electronic", label: "Hard Drive" },
  modem: { category: "Electronic", label: "Modem / Router" },
  "electric fan": { category: "Electronic", label: "Electric Fan" },
  "hair dryer": { category: "Electronic", label: "Hair Dryer" },
  toaster: { category: "Electronic", label: "Toaster" },
  microwave: { category: "Electronic", label: "Microwave" },
  refrigerator: { category: "Electronic", label: "Refrigerator" },
  washer: { category: "Electronic", label: "Washing Machine" },
  vacuum: { category: "Electronic", label: "Vacuum Cleaner" },
  battery: { category: "Electronic", label: "Battery" },
  bulb: { category: "Electronic", label: "Light Bulb" },
  spotlight: { category: "Electronic", label: "Light Fixture" },
  camera: { category: "Electronic", label: "Camera" },
  "Polaroid camera": { category: "Electronic", label: "Camera" },
  earphone: { category: "Electronic", label: "Earphones" },
  headphone: { category: "Electronic", label: "Headphones" },
  speaker: { category: "Electronic", label: "Speaker" },
  charger: { category: "Electronic", label: "Phone Charger" },
  // Student / Lab / Classroom electronics
  calculator: { category: "Electronic", label: "Calculator" },
  "solar dish": { category: "Electronic", label: "Solar Panel" },
  projector: { category: "Electronic", label: "Projector" },
  pencil: { category: "Paper", label: "Pencil" },
  joystick: { category: "Electronic", label: "Joystick / Game Controller" },
  "game controller": { category: "Electronic", label: "Game Controller" },
  switch: { category: "Electronic", label: "Electric Switch" },
  plug: { category: "Electronic", label: "Electric Plug" },
  "power drill": { category: "Electronic", label: "Power Drill" },
  "electric guitar": { category: "Electronic", label: "Electric Guitar" },
  "tape player": { category: "Electronic", label: "Tape Player" },
  "CRT screen": { category: "Electronic", label: "CRT Monitor" },
  USB: { category: "Electronic", label: "USB Drive" },
  disk: { category: "Electronic", label: "CD/DVD Disc" },

  // ── TEXTILE ──────────────────────────────────────────────────────────────
  jersey: { category: "Textile", label: "Clothing / Jersey" },
  "t-shirt": { category: "Textile", label: "T-Shirt" },
  sweatshirt: { category: "Textile", label: "Sweatshirt" },
  cardigan: { category: "Textile", label: "Cardigan" },
  suit: { category: "Textile", label: "Suit" },
  sock: { category: "Textile", label: "Socks" },
  shoe: { category: "Textile", label: "Shoes" },
  "running shoe": { category: "Textile", label: "Running Shoes" },
  "tennis shoe": { category: "Textile", label: "Tennis Shoes" },
  sandal: { category: "Textile", label: "Sandals" },
  "flip-flop": { category: "Textile", label: "Flip-Flops / Slippers" },
  slipper: { category: "Textile", label: "Slippers" },
  jean: { category: "Textile", label: "Jeans" },
  miniskirt: { category: "Textile", label: "Skirt" },
  "bow tie": { category: "Textile", label: "Clothing Accessory" },
  umbrella: { category: "Textile", label: "Umbrella" },
  backpack: { category: "Textile", label: "Backpack" },
  purse: { category: "Textile", label: "Purse / Bag" },
  "sleeping bag": { category: "Textile", label: "Sleeping Bag" },
  pillow: { category: "Textile", label: "Pillow" },
  quilt: { category: "Textile", label: "Quilt / Blanket" },
  "bath towel": { category: "Textile", label: "Towel" },
  // Student / Household textile
  "lab coat": { category: "Textile", label: "Lab Coat" },
  apron: { category: "Textile", label: "Apron" },
  cap: { category: "Textile", label: "Cap / Hat" },
  "cowboy hat": { category: "Textile", label: "Hat" },
  mortarboard: { category: "Textile", label: "Graduation Cap" },
  "shower curtain": { category: "Textile", label: "Curtain" },
  "window screen": { category: "Textile", label: "Window Screen / Mesh" },
  handkerchief: { category: "Textile", label: "Handkerchief" },
  "seat belt": { category: "Textile", label: "Seat Belt" },
  diaper: { category: "Textile", label: "Diaper" },
  mop: { category: "Textile", label: "Mop" },
  rug: { category: "Textile", label: "Rug / Carpet" },
  doormat: { category: "Textile", label: "Doormat" },
  "teddy bear": { category: "Textile", label: "Stuffed Toy" },
  velvet: { category: "Textile", label: "Velvet Fabric" },

  // ── WOOD ─────────────────────────────────────────────────────────────────
  "rocking chair": { category: "Wood", label: "Wooden Rocking Chair" },
  chair: { category: "Wood", label: "Wooden Chair" },
  "folding chair": { category: "Wood", label: "Folding Chair" },
  "table lamp": { category: "Wood", label: "Wooden Lamp" },
  bookcase: { category: "Wood", label: "Wooden Bookcase" },
  bookshelf: { category: "Wood", label: "Wooden Bookshelf" },
  cabinet: { category: "Wood", label: "Wooden Cabinet" },
  chest: { category: "Wood", label: "Wooden Chest" },
  desk: { category: "Wood", label: "Wooden Desk" },
  cradle: { category: "Wood", label: "Wooden Cradle" },
  "wooden spoon": { category: "Wood", label: "Wooden Utensil" },
  broom: { category: "Wood", label: "Broom / Wooden Handle" },
  "pencil box": { category: "Wood", label: "Wooden Box" },
  ruler: { category: "Wood", label: "Wooden Ruler" },
  // Classroom / Household wood
  crib: { category: "Wood", label: "Wooden Crib" },
  "dining table": { category: "Wood", label: "Wooden Dining Table" },
  "park bench": { category: "Wood", label: "Wooden Bench" },
  "picket fence": { category: "Wood", label: "Wooden Fence" },
  "picture frame": { category: "Wood", label: "Wooden Picture Frame" },
  "window frame": { category: "Wood", label: "Wooden Window Frame" },
  "cutting board": { category: "Wood", label: "Wooden Cutting Board" },
  "baseball bat": { category: "Wood", label: "Wooden Baseball Bat" },
  "cricket bat": { category: "Wood", label: "Wooden Cricket Bat" },
};

// ─── Map ImageNet label to waste category ─────────────────────────────────
const mapToWasteCategory = (predictions) => {
  for (const pred of predictions) {
    const label = pred.className.toLowerCase();

    // Check direct match first
    for (const [key, val] of Object.entries(CLASS_MAP)) {
      if (label.includes(key)) {
        return {
          label: val.label,
          category: val.category,
          confidence: Math.round(pred.probability * 100),
          rawLabel: pred.className,
        };
      }
    }
  }

  // Keyword fallback — scan all predictions for category hints
  const allLabels = predictions.map((p) => p.className.toLowerCase()).join(" ");

  if (
    allLabels.match(
      /plastic|bottle|container|bag|pvc|nylon|bucket|bin|jug|tray|crate|strainer|dispenser|syringe/,
    )
  )
    return {
      label: "Plastic Item",
      category: "Plastic",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /glass|mirror|lens|crystal|beaker|flask|vase|goblet|jar|bowl/,
    )
  )
    return {
      label: "Glass Item",
      category: "Glass",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /metal|steel|iron|copper|aluminum|tin|can|watch|clock|knife|fork|spoon|pan|pot|kettle|scissors|nail|chain|lock|ring|bracelet|necklace|stapl/,
    )
  )
    return {
      label: "Metal Item",
      category: "Metal",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /paper|cardboard|book|newspaper|carton|envelope|binder|notebook|note pad|tissue|letter/,
    )
  )
    return {
      label: "Paper Item",
      category: "Paper",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /food|fruit|vegetable|organic|plant|leaf|banana|orange|apple|bread|pizza|mushroom|flower/,
    )
  )
    return {
      label: "Food Waste",
      category: "Organic",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /electronic|computer|phone|device|cable|wire|circuit|keyboard|mouse|monitor|screen|laptop|printer|camera|calculator|battery|charger|speaker|headphone|earphone|tablet|projector|remote/,
    )
  )
    return {
      label: "Electronic Item",
      category: "Electronic",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /cloth|fabric|shirt|dress|textile|cotton|wool|shoe|sandal|jean|sock|jacket|coat|hat|cap|bag|backpack|pillow|towel|blanket|curtain|apron|glove|slipper/,
    )
  )
    return {
      label: "Textile Item",
      category: "Textile",
      confidence: 60,
      rawLabel: predictions[0].className,
    };
  if (
    allLabels.match(
      /wood|furniture|chair|table|timber|plank|desk|cabinet|bench|frame|bat|shelf|bookcase/,
    )
  )
    return {
      label: "Wooden Item",
      category: "Wood",
      confidence: 60,
      rawLabel: predictions[0].className,
    };

  // Unknown — return top prediction as-is
  return {
    label: predictions[0].className,
    category: "Plastic", // safest default
    confidence: Math.round(predictions[0].probability * 100),
    rawLabel: predictions[0].className,
  };
};

// ─── MATERIAL MAP → our app format ────────────────────────────────────────
const MATERIAL_DISPLAY = {
  Plastic: "Plastic",
  Glass: "Glass",
  Metal: "Metal",
  Paper: "Paper/Cardboard",
  Organic: "Organic Waste",
  Electronic: "E-Waste",
  Textile: "Cloth/Textile",
  Wood: "Other",
};

// ─── RECYCLABILITY rules ──────────────────────────────────────────────────
const getRecyclability = (category) => {
  const rules = {
    Plastic: { isRecyclable: true, urgency: "medium", donationPossible: false },
    Glass: { isRecyclable: true, urgency: "medium", donationPossible: true },
    Metal: { isRecyclable: true, urgency: "medium", donationPossible: false },
    Paper: { isRecyclable: true, urgency: "low", donationPossible: true },
    Organic: { isRecyclable: false, urgency: "high", donationPossible: false },
    Electronic: { isRecyclable: true, urgency: "high", donationPossible: true },
    Textile: { isRecyclable: true, urgency: "low", donationPossible: true },
    Wood: { isRecyclable: true, urgency: "medium", donationPossible: true },
  };
  return rules[category] || rules.Plastic;
};

// ─── MAIN: classify image from base64 ─────────────────────────────────────
const classifyImage = async (imageBase64) => {
  try {
    const m = await loadModel();
    const jpeg = require("jpeg-js");

    // Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Decode base64 → buffer → raw pixels → tensor
    const buffer = Buffer.from(cleanBase64, "base64");

    // Try JPEG decode first, fall back to PNG
    let width, height, rgbData;
    try {
      const {
        data,
        width: w,
        height: h,
      } = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
      width = w;
      height = h;
      // Convert RGBA → RGB (MobileNet expects 3 channels)
      rgbData = new Int32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        rgbData[i * 3] = data[i * 4]; // R
        rgbData[i * 3 + 1] = data[i * 4 + 1]; // G
        rgbData[i * 3 + 2] = data[i * 4 + 2]; // B
      }
    } catch (decodeErr) {
      // Try PNG
      const { PNG } = require("pngjs");
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
      rgbData = new Int32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        rgbData[i * 3] = png.data[i * 4];
        rgbData[i * 3 + 1] = png.data[i * 4 + 1];
        rgbData[i * 3 + 2] = png.data[i * 4 + 2];
      }
    }

    // Create tensor [height, width, 3] with int32 values 0-255
    const decoded = tf.tensor3d(rgbData, [height, width, 3], "int32");

    // Run MobileNet
    const predictions = await m.classify(decoded, 5); // top 5 predictions
    decoded.dispose(); // free memory

    console.log(
      "🧠 MobileNet predictions:",
      predictions.map(
        (p) => `${p.className} (${(p.probability * 100).toFixed(1)}%)`,
      ),
    );

    // Map to waste category
    const result = mapToWasteCategory(predictions);
    const recycle = getRecyclability(result.category);

    return {
      label: result.label,
      material: MATERIAL_DISPLAY[result.category] || "Other",
      category: result.category,
      confidence: result.confidence,
      reasoning: `MobileNet identified this as "${result.rawLabel}" — classified as ${result.category} waste`,
      isRecyclable: recycle.isRecyclable,
      urgency: recycle.urgency,
      donationPossible: recycle.donationPossible,
      condition: "fair", // MobileNet can't assess condition — default to fair
      source: "mobilenet",
    };
  } catch (err) {
    console.error("❌ MobileNet classification error:", err.message);
    throw err;
  }
};

module.exports = { classifyImage, loadModel };
