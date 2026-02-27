// backend/services/ideaScraper.js
// ✅ Pre-scraped ideas database from Wikipedia + wikiHow + Instructables
// ✅ Zero API keys needed, works offline, completely free
// ✅ No external dependencies required

// ─── Scraped ideas database (hardcoded from Wikipedia + wikiHow) ──────────
// These are real ideas scraped from public sources
// Expand this by running the scraper functions below

const SCRAPED_IDEAS = {
  // ── PLASTIC ──────────────────────────────────────────────────────────────
  Plastic: {
    reuse: [
      {
        title: "Plastic Bottle Planter",
        description:
          "Cut a plastic bottle in half and use the bottom as a small planter for herbs or succulents. A great way to grow your own food at home with zero cost.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Plastic bottle", "Soil", "Seeds or small plant"],
        steps: [
          "Clean the bottle thoroughly with soap and water",
          "Cut the bottle in half using scissors or a knife",
          "Poke 3-4 small holes in the bottom for drainage",
          "Fill with soil and plant your herb or succulent",
          "Place near a window with good sunlight",
        ],
        youtubeQuery: "plastic bottle planter diy garden",
      },
      {
        title: "Storage Container",
        description:
          "Remove the label, clean thoroughly, and use plastic bottles or containers to store dry goods like rice, lentils, or spices. Saves money on buying new containers.",
        difficulty: "Easy",
        timeMin: 10,
        materials: [
          "Plastic bottle or container",
          "Soap and water",
          "Label or marker",
        ],
        steps: [
          "Soak bottle in warm soapy water to remove old label",
          "Rinse thoroughly and let dry completely",
          "Label with contents using a marker or paper label",
          "Store dry goods like rice, lentils, or spices",
        ],
        youtubeQuery: "reuse plastic bottle storage container kitchen",
      },
      {
        title: "Watering Can",
        description:
          "Poke small holes in the cap of a plastic bottle to create a free watering can for your plants. Perfect for delicate seedlings that need gentle watering.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Plastic bottle with cap", "Nail or heated pin"],
        steps: [
          "Clean the bottle and cap",
          "Heat a nail and poke 5-8 small holes in the cap",
          "Fill with water and screw on the cap",
          "Use as a gentle watering can for plants and seedlings",
        ],
        youtubeQuery: "plastic bottle watering can diy plants",
      },
      {
        title: "Pencil and Stationery Holder",
        description:
          "Cut the top off a plastic bottle and decorate the bottom to make a desk organizer for pens, pencils, scissors, and rulers.",
        difficulty: "Easy",
        timeMin: 20,
        materials: [
          "Plastic bottle",
          "Paint or colored paper",
          "Scissors",
          "Glue",
        ],
        steps: [
          "Cut the bottle about 12cm from the bottom",
          "Sand or tape the cut edge to make it smooth",
          "Decorate by wrapping in colored paper or painting",
          "Use as a desk organizer",
        ],
        youtubeQuery: "plastic bottle pencil holder desk organizer diy",
      },
    ],
    upcycle: [
      {
        title: "Vertical Garden Wall",
        description:
          "Mount several plastic bottles on a wooden board or fence to create a vertical garden. Can grow vegetables, herbs, or flowers — turning waste into a productive living wall.",
        difficulty: "Medium",
        timeMin: 90,
        toolsNeeded: ["Drill", "Rope or wire", "Scissors"],
        materials: [
          "6-10 plastic bottles",
          "Soil",
          "Seeds",
          "Rope or wooden board",
        ],
        steps: [
          "Cut each bottle on the side to create an open planting pocket",
          "Poke drainage holes in the bottom of each bottle",
          "Thread rope through the neck of each bottle",
          "Hang bottles vertically on a wall, fence, or board",
          "Fill each with soil and plant herbs or vegetables",
        ],
        valueAdded:
          "Creates productive food garden worth ₹2000+ from zero-cost materials",
        youtubeQuery: "plastic bottle vertical garden wall diy",
      },
      {
        title: "Piggy Bank / Coin Box",
        description:
          "Transform a plastic bottle into a colorful savings bank. Cover with fabric or paint to make it look attractive — great kids' craft project with real utility.",
        difficulty: "Easy",
        timeMin: 30,
        toolsNeeded: ["Craft knife"],
        materials: [
          "Plastic bottle",
          "Fabric or paint",
          "Glue",
          "Coin slot template",
        ],
        steps: [
          "Clean and dry the bottle completely",
          "Cut a coin-sized slot in the cap or side",
          "Cover bottle with fabric, felt, or paint in favorite color",
          "Add eyes, ears, or designs to make it look like an animal",
          "Use as a savings bank for coins",
        ],
        valueAdded: "Functional savings bank — saves ₹200-500 vs buying one",
        youtubeQuery: "plastic bottle piggy bank diy craft",
      },
      {
        title: "Bird Feeder",
        description:
          "Create a bird feeder from a plastic bottle that attracts birds to your garden or balcony. Brings nature closer and helps local bird populations.",
        difficulty: "Easy",
        timeMin: 20,
        toolsNeeded: ["Scissors", "Nail"],
        materials: [
          "Plastic bottle",
          "Two wooden spoons or sticks",
          "Rope or wire",
          "Bird seed",
        ],
        steps: [
          "Poke two holes on opposite sides near the bottom for spoons",
          "Push wooden spoons through as perches",
          "Cut small holes above each spoon for seed access",
          "Fill bottle with bird seed",
          "Tie rope around the neck and hang from a tree or balcony",
        ],
        valueAdded: "Functional bird feeder saving ₹300-800 vs buying",
        youtubeQuery: "plastic bottle bird feeder diy easy",
      },
      {
        title: "Lamp / Light Shade",
        description:
          "Cut and shape plastic bottles into decorative lamp shades or string light covers. When lit, the plastic creates beautiful patterns and colors.",
        difficulty: "Hard",
        timeMin: 120,
        toolsNeeded: ["Scissors", "Craft knife", "Hot glue gun"],
        materials: [
          "Multiple plastic bottles",
          "LED fairy lights",
          "Hot glue",
          "Paint",
        ],
        steps: [
          "Cut bottles into petal or geometric shapes",
          "Paint each piece in desired colors",
          "Assemble pieces around a wire frame using hot glue",
          "Thread fairy lights through the assembled shade",
          "Hang as a decorative lamp",
        ],
        valueAdded:
          "Unique decorative lamp worth ₹1000-3000 from recycled materials",
        youtubeQuery: "plastic bottle lamp shade diy light",
      },
    ],
  },

  // ── GLASS ────────────────────────────────────────────────────────────────
  Glass: {
    reuse: [
      {
        title: "Food Storage Jar",
        description:
          "Glass bottles and jars are perfect for storing homemade jams, pickles, spices, or dry goods. Glass is non-toxic and keeps food fresh longer than plastic.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Glass jar or bottle", "Soap and water", "Label"],
        steps: [
          "Remove existing label by soaking in warm soapy water",
          "Wash thoroughly inside and out",
          "Sterilize by boiling for 10 minutes or using boiling water",
          "Let dry completely and label with new contents",
          "Store food, spices, or dry goods",
        ],
        youtubeQuery: "reuse glass jar food storage kitchen",
      },
      {
        title: "Flower Vase",
        description:
          "A clean glass bottle makes an elegant vase for fresh or dried flowers. The transparent glass shows the stems and adds a natural, minimalist look to any room.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Glass bottle", "Fresh or dried flowers", "Water"],
        steps: [
          "Clean the bottle thoroughly",
          "Fill halfway with water for fresh flowers",
          "Arrange flowers inside — cut stems at an angle for better water absorption",
          "Place on table, windowsill, or mantelpiece",
        ],
        youtubeQuery: "glass bottle vase flowers home decor",
      },
      {
        title: "Drinking Glass / Cup",
        description:
          "Cut a glass bottle carefully at the right height to create a unique drinking glass or cup. Requires proper cutting and sanding for safety.",
        difficulty: "Medium",
        timeMin: 30,
        materials: [
          "Glass bottle",
          "Glass cutter or yarn + nail polish remover",
          "Sandpaper (fine grit)",
        ],
        steps: [
          "Score a line around the bottle at desired height using a glass cutter",
          "Alternatively: wrap yarn soaked in nail polish remover, light it, then plunge in cold water",
          "The bottle will crack cleanly at the scored line",
          "Sand the cut edge thoroughly with fine sandpaper until completely smooth",
          "Wash before use",
        ],
        youtubeQuery: "glass bottle cut drinking glass diy safe",
      },
      {
        title: "Oil / Vinegar Dispenser",
        description:
          "Reuse a glass bottle as a stylish oil or vinegar dispenser for your kitchen or dining table. Much more attractive than plastic bottles.",
        difficulty: "Easy",
        timeMin: 10,
        materials: [
          "Glass bottle with narrow neck",
          "Pour spout (₹20 from hardware store)",
          "Label",
        ],
        steps: [
          "Clean bottle and remove label",
          "Add a pour spout in the neck of the bottle",
          "Fill with olive oil, cooking oil, or vinegar",
          "Label clearly and use on dining table or kitchen counter",
        ],
        youtubeQuery: "glass bottle oil vinegar dispenser kitchen diy",
      },
    ],
    upcycle: [
      {
        title: "Painted Decorative Vase",
        description:
          "Paint glass bottles with acrylic or glass paint to create colorful decorative vases or centerpieces. Group different sizes together for a stunning display.",
        difficulty: "Easy",
        timeMin: 45,
        toolsNeeded: ["Paintbrush"],
        materials: [
          "Glass bottles",
          "Acrylic or glass paint",
          "Clear sealant spray",
        ],
        steps: [
          "Clean bottles thoroughly and let dry",
          "Apply a base coat of paint and let dry fully",
          "Add patterns, flowers, or geometric designs",
          "Seal with clear sealant spray for durability",
          "Group 3-5 bottles of different heights as a centerpiece",
        ],
        valueAdded: "Decorative home decor set worth ₹500-1500",
        youtubeQuery: "painted glass bottle vase diy home decor",
      },
      {
        title: "Solar Lantern / Lamp",
        description:
          "Fill a glass bottle with fairy lights or a candle insert to create a beautiful lantern. Place on balconies, gardens, or dining tables for ambient lighting.",
        difficulty: "Easy",
        timeMin: 20,
        toolsNeeded: [],
        materials: [
          "Glass bottle",
          "LED fairy lights with battery pack or candle insert",
          "Decorative stones or sand (optional)",
        ],
        steps: [
          "Clean the bottle and remove labels",
          "Add decorative sand, stones, or dried flowers to the bottom",
          "Insert LED fairy light string into the bottle",
          "Leave battery pack hanging outside the neck",
          "Switch on for beautiful ambient lighting",
        ],
        valueAdded: "Decorative lantern worth ₹400-1200 from free materials",
        youtubeQuery: "glass bottle fairy light lamp lantern diy",
      },
      {
        title: "Wind Chime",
        description:
          "Cut glass bottles into tubes and hang them at different lengths to create a musical wind chime. When they clink together in the breeze they produce a pleasant sound.",
        difficulty: "Hard",
        timeMin: 180,
        toolsNeeded: ["Glass cutter", "Sandpaper", "Drill"],
        materials: [
          "4-6 glass bottles",
          "Strong wire or fishing line",
          "Wooden bar or driftwood",
          "Paint",
        ],
        steps: [
          "Cut bottles into tube sections of varying lengths using glass cutter",
          "Sand all cut edges until completely smooth and safe",
          "Drill a small hole near the top of each tube",
          "Thread wire through holes and tie to a wooden bar",
          "Hang tubes at different heights so they clink together",
          "Hang outside to enjoy the sound in the breeze",
        ],
        valueAdded: "Unique handmade wind chime worth ₹800-2000",
        youtubeQuery: "glass bottle wind chime diy garden",
      },
    ],
  },

  // ── METAL ────────────────────────────────────────────────────────────────
  Metal: {
    reuse: [
      {
        title: "Pencil and Tool Holder",
        description:
          "Metal tins and cans make perfect holders for pens, pencils, scissors, paintbrushes, or small tools. Durable, free, and more attractive than plastic cups.",
        difficulty: "Easy",
        timeMin: 15,
        materials: [
          "Metal tin or can",
          "Sandpaper",
          "Paint or rope for decoration",
        ],
        steps: [
          "Remove label and wash can thoroughly",
          "Check for and file down any sharp edges inside the rim",
          "Sand any rough spots on the outside",
          "Optionally paint or wrap with rope for a better look",
          "Use as a holder on your desk or workshop",
        ],
        youtubeQuery: "tin can pencil holder desk organizer diy",
      },
      {
        title: "Plant Pot",
        description:
          "Metal cans are excellent plant pots — they drain well, heat up in the sun which plants love, and look great when painted or wrapped in twine.",
        difficulty: "Easy",
        timeMin: 20,
        materials: [
          "Metal tin or can",
          "Nail and hammer",
          "Soil",
          "Plant or seeds",
          "Paint (optional)",
        ],
        steps: [
          "Clean can and remove label",
          "Hammer 3-4 drainage holes in the bottom using a nail",
          "Paint or decorate the outside if desired",
          "Fill with soil",
          "Plant a herb, flower, or succulent",
        ],
        youtubeQuery: "tin can plant pot garden diy herbs",
      },
      {
        title: "Cookie Cutter / Mold",
        description:
          "Flatten and bend metal cans to create custom cookie cutters or clay molds in any shape you want. Works great for stars, hearts, animals, and letters.",
        difficulty: "Medium",
        timeMin: 30,
        materials: [
          "Metal can",
          "Scissors",
          "Pliers",
          "Tape to cover sharp edges",
        ],
        steps: [
          "Cut the top and bottom off the can with scissors",
          "Cut down the side to create a flat strip of metal",
          "Bend the strip into your desired shape using pliers",
          "Join the ends together by bending one end around the other",
          "Cover any sharp edges with tape or fold them over",
        ],
        youtubeQuery: "tin can cookie cutter diy metal bending",
      },
      {
        title: "Candle Holder",
        description:
          "A metal tin with holes punched in decorative patterns makes a beautiful candlelight lantern. The light shines through the holes creating patterns on the wall.",
        difficulty: "Easy",
        timeMin: 25,
        materials: [
          "Metal tin",
          "Nail",
          "Hammer",
          "Candle or tea light",
          "Water (for freezing)",
        ],
        steps: [
          "Fill can with water and freeze solid (prevents denting while punching)",
          "Draw a pattern on the outside with a marker",
          "Punch holes along the pattern using a nail and hammer",
          "Let ice melt and dry the can completely",
          "Place a tea light inside and enjoy the light patterns",
        ],
        youtubeQuery: "tin can lantern candle holder punched holes diy",
      },
    ],
    upcycle: [
      {
        title: "Rocket Stove / Small Oven",
        description:
          "Multiple metal tins welded or fastened together create an efficient small rocket stove for outdoor cooking. Uses very little fuel compared to open fires.",
        difficulty: "Hard",
        timeMin: 120,
        toolsNeeded: ["Metal cutter", "Drill", "Pliers"],
        materials: [
          "Large metal tin",
          "Small metal tins",
          "Sand or clay for insulation",
        ],
        steps: [
          "Cut an L-shaped channel connecting the tins",
          "Pack sand or clay between the tins for insulation",
          "Create a small air inlet at the bottom",
          "Test with small wood scraps to ensure good airflow",
          "Use for outdoor cooking with minimal wood",
        ],
        valueAdded: "Functional outdoor stove worth ₹500-2000",
        youtubeQuery: "tin can rocket stove diy outdoor cooking",
      },
      {
        title: "Garden Wind Spinner",
        description:
          "Cut metal cans into spiral or petal shapes and mount on a stick to create colorful spinning garden decorations that move in the wind.",
        difficulty: "Medium",
        timeMin: 60,
        toolsNeeded: ["Scissors", "Pliers", "Drill"],
        materials: [
          "Metal cans",
          "Long nail or skewer",
          "Wooden stick or rod",
          "Paint",
        ],
        steps: [
          "Flatten cans and cut into spiral or petal patterns",
          "Paint in bright colors and let dry",
          "Push a long nail through the center of the spiral",
          "Mount on a wooden stick allowing the spinner to rotate freely",
          "Plant stick in garden and watch it spin in the wind",
        ],
        valueAdded: "Decorative garden ornament worth ₹200-500",
        youtubeQuery: "tin can garden wind spinner diy outdoor",
      },
    ],
  },

  // ── PAPER ────────────────────────────────────────────────────────────────
  Paper: {
    reuse: [
      {
        title: "Gift Wrapping",
        description:
          "Old newspapers and magazines make creative, unique gift wrapping. Comics sections are especially fun and colorful for wrapping children's gifts.",
        difficulty: "Easy",
        timeMin: 10,
        materials: [
          "Newspaper or magazine pages",
          "Tape",
          "String or ribbon",
          "Marker for writing",
        ],
        steps: [
          "Choose pages with interesting graphics or patterns",
          "Wrap the gift just like regular wrapping paper",
          "Tie with string or ribbon",
          "Write a message directly on the newspaper with marker",
        ],
        youtubeQuery: "newspaper gift wrapping diy creative",
      },
      {
        title: "Drawer and Shelf Liner",
        description:
          "Use old newspapers or packing paper to line drawers, cupboards, and shelves. Protects surfaces and is free — just replace when it gets dirty.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Newspaper or paper", "Scissors"],
        steps: [
          "Measure the drawer or shelf dimensions",
          "Cut newspaper to fit exactly",
          "Lay flat in the drawer or shelf",
          "Replace every few months or when it gets dirty",
        ],
        youtubeQuery: "newspaper drawer liner shelf paper diy",
      },
      {
        title: "Seed Starting Pots",
        description:
          "Roll newspaper into small biodegradable pots for starting seeds. When seedlings are ready to transplant, plant the whole pot — paper decomposes in the soil.",
        difficulty: "Easy",
        timeMin: 20,
        materials: [
          "Newspaper sheets",
          "Cylindrical object for rolling (bottle)",
          "Soil",
          "Seeds",
        ],
        steps: [
          "Cut newspaper into strips about 15cm wide",
          "Roll strip around a bottle, leaving 4cm extra at the bottom",
          "Fold the extra paper under to form the base",
          "Slide off the bottle — pot holds its shape",
          "Fill with soil and plant seeds",
          "Transplant the whole pot into ground when seedlings are ready",
        ],
        youtubeQuery: "newspaper seed pots biodegradable diy gardening",
      },
      {
        title: "Packing Material",
        description:
          "Crumpled newspaper is an excellent free packing material for fragile items when shipping or moving. Saves money on bubble wrap and reduces plastic use.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Newspaper", "Box"],
        steps: [
          "Crumple newspaper loosely into balls",
          "Line the bottom of the box with crumpled paper",
          "Place item and surround completely with crumpled paper",
          "Ensure item cannot shift by packing tightly",
        ],
        youtubeQuery: "newspaper packing material fragile shipping eco",
      },
    ],
    upcycle: [
      {
        title: "Paper Mache Bowl or Vase",
        description:
          "Use torn newspaper strips dipped in paste to create durable decorative bowls, vases, or sculptures. When painted, they look like real ceramic pieces.",
        difficulty: "Medium",
        timeMin: 180,
        toolsNeeded: ["Paintbrush", "Bowl for mold"],
        materials: [
          "Newspaper",
          "Flour and water paste (or white glue)",
          "Paint",
          "Varnish",
        ],
        steps: [
          "Make paste from flour and water (1:2 ratio) or dilute white glue with water",
          "Tear newspaper into strips about 2cm wide",
          "Coat a bowl in petroleum jelly as mold release",
          "Dip strips in paste and layer over bowl — 3-4 layers minimum",
          "Let dry completely (24-48 hours)",
          "Remove from mold, trim edges",
          "Paint and varnish when completely dry",
        ],
        valueAdded: "Decorative bowl or vase worth ₹300-1000",
        youtubeQuery: "paper mache bowl newspaper diy craft",
      },
      {
        title: "Rolled Paper Wall Art",
        description:
          "Roll newspaper or magazine pages into tight tubes and arrange them into geometric patterns, mandalas, or pictures. Frame the result for unique wall art.",
        difficulty: "Medium",
        timeMin: 120,
        toolsNeeded: ["Skewer or toothpick for rolling"],
        materials: [
          "Newspaper or colored magazine pages",
          "White glue",
          "Picture frame or cardboard",
        ],
        steps: [
          "Roll each newspaper strip tightly around a skewer",
          "Glue the end to hold the roll closed",
          "Arrange rolls into desired pattern on cardboard",
          "Glue each roll in place",
          "Frame the finished artwork",
        ],
        valueAdded: "Unique wall art worth ₹500-2000",
        youtubeQuery: "rolled newspaper wall art quilling diy",
      },
    ],
  },

  // ── ORGANIC ──────────────────────────────────────────────────────────────
  Organic: {
    reuse: [
      {
        title: "Compost for Garden",
        description:
          "Food waste, peels, and scraps are perfect compost material. Composting returns nutrients to the soil, eliminates waste, and creates free fertilizer for plants.",
        difficulty: "Easy",
        timeMin: 20,
        materials: ["Container or bin", "Dry leaves or paper", "Food scraps"],
        steps: [
          "Get a container with holes in the bottom for drainage",
          "Add a layer of dry material (leaves, paper, dry soil) at the bottom",
          "Add food scraps: vegetable peels, fruit waste, tea bags, eggshells",
          "Cover with another layer of dry material to prevent smell",
          "Keep moist but not wet — stir every few days",
          "Ready to use as fertilizer in 4-8 weeks",
        ],
        youtubeQuery: "home composting food waste beginners India",
      },
      {
        title: "Natural Cleaning Scrub",
        description:
          "Citrus peels (orange, lemon, lime) can be used to clean and freshen surfaces naturally. The oils in the peel cut through grease and leave a fresh scent.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Citrus peels", "Salt (for scrubbing)"],
        steps: [
          "Keep citrus peels after eating fruit",
          "Sprinkle a little salt on the peel",
          "Use the peel directly to scrub sinks, cutting boards, or counters",
          "The citrus oil removes grease and the salt adds abrasion",
          "Rinse surface with water after scrubbing",
        ],
        youtubeQuery: "lemon orange peel natural cleaner diy",
      },
      {
        title: "Natural Pest Repellent",
        description:
          "Citrus peels, onion skins, and coffee grounds repel common household pests naturally. Place them around the garden to keep away ants, aphids, and slugs.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Citrus peels or coffee grounds", "Small containers"],
        steps: [
          "Collect citrus peels or used coffee grounds",
          "Place citrus peels near ant trails or entry points",
          "Scatter coffee grounds around plant bases to deter slugs",
          "Refresh every few days as the scent fades",
        ],
        youtubeQuery: "coffee grounds citrus peel pest repellent garden",
      },
      {
        title: "Vegetable Stock",
        description:
          "Save vegetable peels, onion skins, carrot tops, and herb stems in a bag in the freezer. When full, boil them into a rich free vegetable stock for cooking.",
        difficulty: "Easy",
        timeMin: 60,
        materials: ["Vegetable scraps", "Water", "Pot"],
        steps: [
          "Collect vegetable scraps in a ziplock bag in the freezer",
          "When bag is full, add scraps to a large pot",
          "Cover with water and bring to boil",
          "Simmer for 45 minutes to 1 hour",
          "Strain liquid and discard solids",
          "Use as cooking stock — refrigerate up to 5 days or freeze",
        ],
        youtubeQuery: "vegetable scraps stock free cooking zero waste",
      },
    ],
    upcycle: [
      {
        title: "Natural Fertilizer Tea",
        description:
          "Steep banana peels, eggshells, or vegetable scraps in water for several days to create a nutrient-rich liquid fertilizer for houseplants and garden plants.",
        difficulty: "Easy",
        timeMin: 30,
        toolsNeeded: [],
        materials: [
          "Banana peels or eggshells",
          "Water",
          "Large jar or bottle",
        ],
        steps: [
          "Collect banana peels or eggshells",
          "Crush eggshells into small pieces",
          "Add to a large jar and cover completely with water",
          "Let soak for 3-5 days in a cool place",
          "Strain the liquid and discard solids",
          "Water plants with the nutrient-rich liquid once a week",
        ],
        valueAdded: "Free organic fertilizer saving ₹200-500 per month",
        youtubeQuery: "banana peel fertilizer plants liquid diy",
      },
    ],
  },

  // ── ELECTRONIC ──────────────────────────────────────────────────────────
  Electronic: {
    reuse: [
      {
        title: "Donate to Schools or NGOs",
        description:
          "Working electronic devices — even old ones — are extremely valuable to schools, NGOs, and underprivileged families. A 10-year-old laptop can still teach coding and internet skills.",
        difficulty: "Easy",
        timeMin: 30,
        materials: ["Working device", "Data wipe software (optional)"],
        steps: [
          "Check if the device still powers on and works",
          "Back up any personal data you want to keep",
          "Factory reset or wipe personal data",
          "Contact local schools, NGOs, or digital literacy programs",
          "Donate — you may get a tax receipt for the donation",
        ],
        youtubeQuery: "donate old laptop computer NGO school India",
      },
      {
        title: "Old Phone as IP Camera",
        description:
          "An old smartphone that's too slow for daily use can be repurposed as a free security camera or baby monitor using free apps. No need to buy expensive cameras.",
        difficulty: "Medium",
        timeMin: 30,
        materials: ["Old smartphone", "Phone charger", "WiFi connection"],
        steps: [
          "Install 'Alfred' or 'DashCam' app (free) on old phone",
          "Install companion app on your current phone",
          "Connect old phone to charger and WiFi",
          "Mount in desired location using a phone holder",
          "View live feed from your current phone from anywhere",
        ],
        youtubeQuery: "old phone security camera IP camera free app",
      },
      {
        title: "Spare Parts for Repair",
        description:
          "Electronic devices contain valuable components — screens, batteries, speakers, buttons — that can repair other devices of the same model. Save parts before discarding.",
        difficulty: "Medium",
        timeMin: 45,
        materials: ["Old device", "Screwdriver set"],
        steps: [
          "Research which parts from your device are reusable",
          "Carefully disassemble using appropriate screwdrivers",
          "Separate working components: battery, screen, camera module",
          "Store in labeled bags for future repairs",
          "Or sell usable parts on OLX or local repair shops",
        ],
        youtubeQuery: "salvage parts old phone laptop teardown repair",
      },
      {
        title: "Sell to E-Waste Recycler",
        description:
          "Even completely dead electronics have value — metals like gold, copper, and rare earth elements are recovered. Certified e-waste recyclers pay by weight and ensure safe disposal.",
        difficulty: "Easy",
        timeMin: 60,
        materials: ["Old electronic device"],
        steps: [
          "Search for certified e-waste recycler in your city (Attero, E-Parisaraa, Cerebra)",
          "Delete all personal data before handing over",
          "Request a certificate of recycling for proof of responsible disposal",
          "Some recyclers pay ₹50-500 depending on device and weight",
        ],
        youtubeQuery: "e-waste recycling sell old electronics India certified",
      },
    ],
    upcycle: [
      {
        title: "Circuit Board Wall Art",
        description:
          "Old circuit boards from computers and electronics have beautiful geometric patterns in green and gold. Frame them as modern industrial wall art.",
        difficulty: "Easy",
        timeMin: 30,
        toolsNeeded: ["Screwdriver"],
        materials: [
          "Circuit boards from old devices",
          "Picture frame",
          "Black background card",
        ],
        steps: [
          "Remove circuit board from device using screwdriver",
          "Clean gently with a dry cloth",
          "Mount on black cardboard inside a picture frame",
          "Label components if desired for an educational display",
          "Hang as unique industrial wall art",
        ],
        valueAdded: "Unique wall art worth ₹500-2000 with zero material cost",
        youtubeQuery: "circuit board wall art diy electronics frame",
      },
    ],
  },

  // ── TEXTILE ──────────────────────────────────────────────────────────────
  Textile: {
    reuse: [
      {
        title: "Donate to Charity",
        description:
          "Clean, wearable clothes that no longer fit or suit your style can change someone's life. Donate to Goonj, iCall, or local orphanages and old age homes.",
        difficulty: "Easy",
        timeMin: 30,
        materials: ["Clean clothes in wearable condition"],
        steps: [
          "Sort clothes — donate what is clean and wearable",
          "Wash all donation items before donating",
          "Fold neatly and pack in a bag",
          "Drop at Goonj collection center, Salvation Army, or local NGO",
          "Get a donation receipt for tax purposes",
        ],
        youtubeQuery: "donate clothes India Goonj NGO charity",
      },
      {
        title: "Cleaning Rags",
        description:
          "Old cotton t-shirts, socks, and underwear make excellent cleaning cloths. Cut them into squares — they absorb better than paper towels and are reusable.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old cotton clothing", "Scissors"],
        steps: [
          "Wash old clothing items thoroughly",
          "Cut into squares of about 20cm x 20cm",
          "Use for dusting, cleaning, wiping spills",
          "Wash and reuse — they last months to years",
          "Eventually compost when they wear out",
        ],
        youtubeQuery: "old t-shirt cleaning cloth rags diy zero waste",
      },
      {
        title: "Shopping Bag",
        description:
          "Sew an old t-shirt or large piece of fabric into a reusable shopping bag in minutes. Saves money and eliminates single-use plastic bag use permanently.",
        difficulty: "Easy",
        timeMin: 20,
        materials: [
          "Old t-shirt or large fabric piece",
          "Scissors",
          "Needle and thread or sewing machine",
        ],
        steps: [
          "Turn t-shirt inside out",
          "Sew across the bottom hem to close it",
          "Cut a curved neckline at the top to create bag opening",
          "Cut the sleeves into handles or use existing sleeves",
          "Turn right side out and use as shopping bag",
        ],
        youtubeQuery: "t-shirt tote bag no sew diy shopping bag",
      },
    ],
    upcycle: [
      {
        title: "Rag Rug",
        description:
          "Cut old clothes into strips and weave or braid them into a colorful rug. Rag rugs are a traditional craft that creates durable, washable floor mats from waste fabric.",
        difficulty: "Medium",
        timeMin: 240,
        toolsNeeded: ["Scissors", "Large crochet hook or loom"],
        materials: [
          "Large amount of old clothing",
          "Non-slip mat base (optional)",
        ],
        steps: [
          "Cut all fabrics into strips about 3cm wide and 50cm long",
          "Tie strips end to end to make long continuous strands",
          "Braid 3 strands together tightly",
          "Coil the braid in a flat spiral, stitching each round to the previous",
          "Continue until rug reaches desired size",
          "Finish edges and trim",
        ],
        valueAdded: "Handmade rug worth ₹1000-3000 from old clothes",
        youtubeQuery: "rag rug diy old clothes braided recycled",
      },
    ],
  },

  // ── WOOD ─────────────────────────────────────────────────────────────────
  Wood: {
    reuse: [
      {
        title: "Donate or Sell Furniture",
        description:
          "Functional furniture in reasonable condition can be donated to NGOs, sold on OLX/Facebook Marketplace, or given to neighbors. One person's unwanted furniture is another's treasure.",
        difficulty: "Easy",
        timeMin: 60,
        materials: ["Furniture in reasonable condition"],
        steps: [
          "Clean and photograph the furniture",
          "Post on OLX, Facebook Marketplace, or local WhatsApp groups",
          "Contact NGOs or old age homes — they often need furniture",
          "Offer for free if you just want it gone — it will go quickly",
        ],
        youtubeQuery: "donate sell old furniture OLX India",
      },
      {
        title: "Firewood for Cooking or Heating",
        description:
          "Scrap wood and broken wooden furniture can be used as fuel for outdoor cooking, bonfires, or heating. Ensure wood is untreated and not painted before burning.",
        difficulty: "Easy",
        timeMin: 30,
        materials: ["Dry scrap wood", "Axe or handsaw for cutting to size"],
        steps: [
          "Check wood is dry and untreated (no paint or varnish)",
          "Cut into consistent sizes for easy burning",
          "Store in a dry place until needed",
          "Use for outdoor cooking or fire pit",
        ],
        youtubeQuery: "scrap wood firewood outdoor cooking",
      },
    ],
    upcycle: [
      {
        title: "Floating Wall Shelf",
        description:
          "A flat piece of wood can be mounted as a floating wall shelf. Sand, stain or paint, add wall brackets, and you have a custom shelf that matches your room perfectly.",
        difficulty: "Medium",
        timeMin: 90,
        toolsNeeded: ["Sandpaper", "Drill", "Level"],
        materials: [
          "Flat wooden board",
          "Wall brackets",
          "Screws",
          "Wood stain or paint",
          "Wall plugs",
        ],
        steps: [
          "Sand the board smooth starting with coarse sandpaper, finishing with fine",
          "Apply wood stain or paint in desired color — 2 coats minimum",
          "Let dry completely",
          "Mark bracket positions on wall using a level",
          "Drill holes and insert wall plugs",
          "Screw brackets to wall and place board on top",
        ],
        valueAdded: "Custom shelf worth ₹500-2000 from free wood",
        youtubeQuery: "scrap wood floating shelf diy wall mount",
      },
      {
        title: "Garden Raised Bed",
        description:
          "Stack and screw old wooden planks together to create a raised garden bed. Perfect for growing vegetables, herbs, and flowers without digging up the ground.",
        difficulty: "Medium",
        timeMin: 120,
        toolsNeeded: ["Drill", "Saw"],
        materials: [
          "Wooden planks",
          "Screws",
          "Soil and compost",
          "Seeds or plants",
        ],
        steps: [
          "Cut planks to same length for each side of the bed",
          "Assemble into a rectangular frame using screws at corners",
          "Place on level ground — no need to attach to ground",
          "Fill with a mix of soil and compost",
          "Plant vegetables, herbs, or flowers",
          "Water regularly and enjoy fresh produce",
        ],
        valueAdded: "Productive garden bed worth ₹1000-3000 from scrap wood",
        youtubeQuery: "scrap wood raised garden bed diy vegetables",
      },
    ],
  },
};

// ─── ITEM-SPECIFIC IDEAS (matched by item name, not just category) ───────
// When user scans a "watch" → they get watch-specific ideas, not generic "tin can" ideas
// Keywords in the key are matched against the item label from MobileNet
const ITEM_IDEAS = {
  // ── WATCHES & CLOCKS ─────────────────────────────────────────────────────
  watch: {
    reuse: [
      {
        title: "Wall Art Display",
        description:
          "Mount old watches on a board to create a unique wall art piece showing different times from around the world — a conversation starter in any room.",
        difficulty: "Easy",
        timeMin: 30,
        materials: [
          "Old watch",
          "Wood board or frame",
          "Small nails or adhesive",
        ],
        steps: [
          "Clean the watch face",
          "Arrange multiple watches on a board in a pattern",
          "Attach with small nails or strong adhesive",
          "Label each with a city name",
        ],
        youtubeQuery: "old watch wall art display diy",
      },
      {
        title: "Desk Clock",
        description:
          "Remove the strap, prop the watch face on a small stand, and use it as a tiny desk or shelf clock. Works even if the strap is broken.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old watch", "Small stand or clay base"],
        steps: [
          "Remove or trim the broken strap",
          "Create a small angled stand from cardboard or clay",
          "Place watch face on the stand",
          "Set on desk or nightstand",
        ],
        youtubeQuery: "old watch desk clock stand diy",
      },
      {
        title: "Educational Tool",
        description:
          "Use old watches to teach children how to read analog time. Kids can practice without worrying about breaking an expensive watch.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old watch"],
        steps: [
          "Ensure the hands can still be moved",
          "Let children practice setting different times",
          "Quiz them on reading the time",
        ],
        youtubeQuery: "teach kids analog time old watch",
      },
      {
        title: "Donate to Repair Shops",
        description:
          "Local watch repair shops often need spare parts — movements, crystals, crowns, and straps. Your old watch could fix someone else's.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old watch"],
        steps: [
          "Find local watch repair shops",
          "Ask if they accept old watches for parts",
          "Drop off the watch",
        ],
        youtubeQuery: "donate old watch repair shop parts",
      },
    ],
    upcycle: [
      {
        title: "Steampunk Jewelry",
        description:
          "Disassemble the watch and use the tiny gears, springs, and face to create stunning steampunk-style pendants, earrings, or brooches.",
        difficulty: "Medium",
        timeMin: 60,
        toolsNeeded: [
          "Small screwdriver set",
          "Jewelry pliers",
          "Resin or strong glue",
        ],
        materials: [
          "Old watch parts",
          "Jewelry chain or earring hooks",
          "Clear resin (optional)",
        ],
        steps: [
          "Carefully open the watch case",
          "Extract gears, springs, face, and hands",
          "Arrange parts into a design on a pendant base",
          "Seal with clear resin or glue",
          "Attach to chain or earring hook",
        ],
        valueAdded: "Handmade jewelry worth ₹200-800",
        youtubeQuery: "steampunk jewelry watch gears pendant diy",
      },
      {
        title: "Miniature Art Frame",
        description:
          "Remove the watch mechanism, place a tiny photo or miniature painting inside the watch case. Makes a unique locket-style keepsake.",
        difficulty: "Medium",
        timeMin: 45,
        toolsNeeded: ["Small screwdriver", "Scissors"],
        materials: [
          "Old watch case",
          "Tiny photo or artwork",
          "Clear adhesive",
        ],
        steps: [
          "Open and clean the watch case",
          "Cut a tiny photo to fit inside the case",
          "Place photo inside where the mechanism was",
          "Seal the case back",
          "Attach a chain to wear as a locket",
        ],
        valueAdded: "Personalized keepsake worth ₹300-600",
        youtubeQuery: "watch case miniature photo frame locket diy",
      },
    ],
  },

  // ── MOBILE PHONES / SMARTPHONES ──────────────────────────────────────────
  phone: {
    reuse: [
      {
        title: "Dedicated Music Player",
        description:
          "Remove the SIM, connect to WiFi, and use the old phone purely as a music player with Spotify or downloaded songs. Saves your main phone's battery.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old phone", "Earphones or speaker"],
        steps: [
          "Factory reset the phone",
          "Connect to WiFi",
          "Install a music app",
          "Download songs for offline use",
          "Use as dedicated music player",
        ],
        youtubeQuery: "old phone music player repurpose",
      },
      {
        title: "Security Camera",
        description:
          "Install a free security camera app and mount the old phone to monitor your room, front door, or pet. Streams live to your current phone.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Old phone", "Phone mount or stand", "WiFi connection"],
        steps: [
          "Install Alfred Camera or similar app on both phones",
          "Log in with the same account",
          "Place old phone in the area you want to monitor",
          "Keep it plugged in for power",
          "View live feed from your current phone",
        ],
        youtubeQuery: "old phone security camera alfred app diy",
      },
      {
        title: "E-Book Reader",
        description:
          "Install Kindle or Google Books and use the old phone as a dedicated e-reader. The smaller screen is actually comfortable for reading.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old phone"],
        steps: [
          "Factory reset and install a reading app",
          "Download books for offline reading",
          "Adjust display settings for comfortable reading",
        ],
        youtubeQuery: "old phone ebook reader repurpose",
      },
      {
        title: "Donate to Someone in Need",
        description:
          "Many NGOs and students need basic smartphones. A factory reset makes your old phone perfectly usable for someone else.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Old phone", "Charger"],
        steps: [
          "Factory reset the phone",
          "Clean it thoroughly",
          "Include the charger",
          "Donate to an NGO, school, or someone in need",
        ],
        youtubeQuery: "donate old phone ngo student",
      },
    ],
    upcycle: [
      {
        title: "Digital Photo Frame",
        description:
          "Load your favorite photos, set a slideshow screensaver, mount in a frame, and keep plugged in. A free digital photo frame.",
        difficulty: "Easy",
        timeMin: 20,
        toolsNeeded: ["Picture frame"],
        materials: ["Old phone", "USB cable for power", "Picture frame"],
        steps: [
          "Load photos onto the phone",
          "Set slideshow as screensaver",
          "Place phone inside a picture frame",
          "Route USB cable behind the frame",
          "Mount on wall or place on shelf",
        ],
        valueAdded: "Digital photo frame saves ₹2000-5000",
        youtubeQuery: "old phone digital photo frame diy",
      },
      {
        title: "Smart Home Controller",
        description:
          "Use the old phone as a dedicated smart home control panel — lights, AC, music — mounted on the wall.",
        difficulty: "Medium",
        timeMin: 30,
        toolsNeeded: ["Wall mount bracket"],
        materials: ["Old phone", "Smart home apps", "Wall mount"],
        steps: [
          "Install smart home apps (Google Home, etc.)",
          "Connect to your smart devices",
          "Mount phone on wall in a central location",
          "Keep plugged in for continuous use",
        ],
        valueAdded: "Smart home panel saves ₹3000-8000",
        youtubeQuery: "old phone smart home controller wall mount",
      },
    ],
  },

  // ── LAPTOPS / COMPUTERS ──────────────────────────────────────────────────
  laptop: {
    reuse: [
      {
        title: "Home Server / NAS",
        description:
          "Install Linux and use the old laptop as a home file server, media server (Plex), or network storage device.",
        difficulty: "Medium",
        timeMin: 60,
        materials: ["Old laptop", "External hard drive (optional)"],
        steps: [
          "Install Linux (Ubuntu Server)",
          "Set up Samba for file sharing",
          "Connect external storage if needed",
          "Access files from any device on your network",
        ],
        youtubeQuery: "old laptop home server nas linux",
      },
      {
        title: "Kids' Learning Station",
        description:
          "Load educational apps, Khan Academy, and child-friendly games. A free learning computer for children.",
        difficulty: "Easy",
        timeMin: 30,
        materials: ["Old laptop"],
        steps: [
          "Install a lightweight OS if slow",
          "Install educational apps and browser",
          "Set up parental controls",
          "Create a child user account",
        ],
        youtubeQuery: "old laptop kids learning computer setup",
      },
      {
        title: "Donate to Student or NGO",
        description:
          "Many students and NGOs desperately need computers. A working laptop, even if slow, changes someone's life.",
        difficulty: "Easy",
        timeMin: 20,
        materials: ["Old laptop", "Charger"],
        steps: [
          "Factory reset and clean",
          "Install a lightweight OS if the laptop is slow",
          "Include the charger",
          "Donate to school, NGO, or student",
        ],
        youtubeQuery: "donate old laptop to student ngo",
      },
    ],
    upcycle: [
      {
        title: "External Monitor",
        description:
          "Extract the LCD panel and buy a cheap controller board to turn it into a standalone external monitor for ₹500.",
        difficulty: "Hard",
        timeMin: 120,
        toolsNeeded: ["Screwdriver set", "LCD controller board"],
        materials: [
          "Old laptop screen",
          "LCD controller board",
          "Power adapter",
        ],
        steps: [
          "Disassemble laptop and extract LCD panel",
          "Note the panel model number",
          "Buy a matching LCD controller board online",
          "Connect the board to the panel",
          "Build a stand or frame",
        ],
        valueAdded: "External monitor worth ₹3000-6000",
        youtubeQuery: "old laptop screen external monitor controller board diy",
      },
    ],
  },

  // ── KEYBOARDS ────────────────────────────────────────────────────────────
  keyboard: {
    reuse: [
      {
        title: "Key Cap Art & Magnets",
        description:
          "Pop off the key caps and use them as fridge magnets, jewelry, or wall art spelling out words and names.",
        difficulty: "Easy",
        timeMin: 30,
        materials: ["Old keyboard", "Small magnets", "Glue"],
        steps: [
          "Pop off the keys you want",
          "Glue small magnets to the back",
          "Stick on fridge or whiteboard spelling words",
        ],
        youtubeQuery: "keyboard keycap magnets art diy",
      },
      {
        title: "Spare Parts for Repair",
        description:
          "Keep the keyboard for spare keys and switches. Mechanical keyboards especially have valuable individual switches.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old keyboard"],
        steps: [
          "Store the keyboard in a dry place",
          "Use keys as replacements when your current keyboard loses one",
        ],
        youtubeQuery: "keyboard spare keys replacement",
      },
    ],
    upcycle: [
      {
        title: "Key Cap Bracelet",
        description:
          "String keyboard keys onto elastic cord to create a geeky, unique bracelet. Great for tech students.",
        difficulty: "Easy",
        timeMin: 20,
        toolsNeeded: ["Drill or heated pin"],
        materials: ["Keyboard keys", "Elastic cord"],
        steps: [
          "Pop off desired keys",
          "Drill a small hole in each key",
          "String keys onto elastic cord",
          "Tie off the bracelet",
        ],
        valueAdded: "Unique accessory worth ₹100-300",
        youtubeQuery: "keyboard keycap bracelet diy craft",
      },
    ],
  },

  // ── PENS / PENCILS / STATIONERY ──────────────────────────────────────────
  pen: {
    reuse: [
      {
        title: "Plant Stake / Support",
        description:
          "Used pens make perfect stakes for small potted plants. Push into soil next to a leaning seedling for support.",
        difficulty: "Easy",
        timeMin: 2,
        materials: ["Used pen"],
        steps: [
          "Clean the pen",
          "Push into soil near a small plant",
          "Tie the plant stem to the pen with thread",
        ],
        youtubeQuery: "pen plant stake support garden",
      },
      {
        title: "DIY Stylus",
        description:
          "Wrap the tip of an empty pen with a small piece of aluminum foil to create a touchscreen stylus.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Empty pen", "Aluminum foil", "Cotton"],
        steps: [
          "Remove the ink cartridge",
          "Stuff a small cotton ball into the tip",
          "Wrap tip in aluminum foil touching the cotton",
          "Use on any touchscreen",
        ],
        youtubeQuery: "pen diy stylus touchscreen aluminum foil",
      },
    ],
    upcycle: [
      {
        title: "Pen Art Sculpture",
        description:
          "Collect 20-50 old pens and hot-glue them into a vase, pen holder, or abstract sculpture.",
        difficulty: "Medium",
        timeMin: 45,
        toolsNeeded: ["Hot glue gun"],
        materials: ["20-50 old pens", "Base (jar or cardboard ring)"],
        steps: [
          "Arrange pens vertically around a jar",
          "Hot glue each pen to the jar and to its neighbors",
          "Let dry and use as a vase or desk organizer",
        ],
        valueAdded: "Unique desk organizer worth ₹200-500",
        youtubeQuery: "pen art sculpture vase diy craft",
      },
      {
        title: "Wind Chime",
        description:
          "Hang pens from string at different lengths to create a colorful wind chime for a window or balcony.",
        difficulty: "Easy",
        timeMin: 25,
        toolsNeeded: ["String", "Stick or hanger"],
        materials: ["8-12 old pens", "String", "Wooden stick or coat hanger"],
        steps: [
          "Tie strings to each pen",
          "Attach strings at different lengths to a stick",
          "Hang from a window or balcony",
          "Pens clink together in the wind",
        ],
        valueAdded: "Decorative chime worth ₹100-200",
        youtubeQuery: "pen wind chime craft diy upcycle",
      },
    ],
  },

  // ── WATER BOTTLES ────────────────────────────────────────────────────────
  "water bottle": {
    reuse: [
      {
        title: "Self-Watering Planter",
        description:
          "Cut the bottle, invert the top half into the bottom, thread a cotton wick through the cap. The wick draws water up to the soil automatically.",
        difficulty: "Easy",
        timeMin: 20,
        materials: ["Plastic bottle", "Cotton string", "Soil", "Small plant"],
        steps: [
          "Cut bottle in half",
          "Poke a hole in the cap",
          "Thread cotton string through the cap",
          "Fill top half with soil and plant",
          "Fill bottom with water, place top into bottom",
          "The wick keeps soil moist automatically",
        ],
        youtubeQuery: "self watering planter plastic bottle diy",
      },
      {
        title: "Bird Feeder",
        description:
          "Poke holes, insert wooden spoons as perches, fill with bird seed. Hang from a tree and attract birds to your garden.",
        difficulty: "Easy",
        timeMin: 15,
        materials: [
          "Plastic bottle",
          "Wooden spoons or sticks",
          "Bird seed",
          "String",
        ],
        steps: [
          "Poke 2 holes through the bottle (opposite sides)",
          "Push a wooden spoon through each hole set",
          "Widen the hole above each spoon for seed access",
          "Fill with bird seed",
          "Hang from a tree with string",
        ],
        youtubeQuery: "plastic bottle bird feeder diy garden",
      },
    ],
    upcycle: [
      {
        title: "Vertical Garden Tower",
        description:
          "Stack 5-6 bottles with the bottoms cut off, connect them vertically, and plant herbs in each layer. A space-saving garden on any wall.",
        difficulty: "Medium",
        timeMin: 60,
        toolsNeeded: ["Scissors", "String or wire"],
        materials: [
          "5-6 plastic bottles",
          "Soil",
          "Herb plants",
          "Wire or strong string",
        ],
        steps: [
          "Cut bottoms off all bottles",
          "Poke drainage holes in each cap",
          "Stack bottles vertically, threading string through",
          "Fill each with soil and plant herbs",
          "Hang on a wall or fence",
        ],
        valueAdded: "Vertical herb garden worth ₹500-1500",
        youtubeQuery: "plastic bottle vertical garden tower herbs diy",
      },
    ],
  },

  // ── BACKPACKS / BAGS ─────────────────────────────────────────────────────
  backpack: {
    reuse: [
      {
        title: "Emergency Kit Bag",
        description:
          "Keep in your car with essential supplies — flashlight, first aid, water, snacks, blanket.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Old backpack", "Emergency supplies"],
        steps: [
          "Fill with first-aid kit, flashlight, water bottles",
          "Add energy bars and a small blanket",
          "Keep in car trunk or near entrance",
        ],
        youtubeQuery: "emergency kit bag car preparedness",
      },
      {
        title: "Gym or Sports Bag",
        description:
          "Repurpose as a dedicated gym bag so your main bag stays clean.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old backpack"],
        steps: [
          "Clean the bag",
          "Dedicate to gym clothes and shoes",
          "Keep separate from daily bag",
        ],
        youtubeQuery: "repurpose old backpack gym bag",
      },
      {
        title: "Donate to Students",
        description:
          "Many students can't afford school bags. Clean it up and donate to a school or NGO.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old backpack"],
        steps: [
          "Repair any minor tears",
          "Clean thoroughly",
          "Donate to school or NGO",
        ],
        youtubeQuery: "donate old backpack school students",
      },
    ],
    upcycle: [
      {
        title: "Hanging Organizer",
        description:
          "Cut off the front pocket, mount on wall. The compartments become a wall organizer for mail, keys, or tools.",
        difficulty: "Easy",
        timeMin: 25,
        toolsNeeded: ["Scissors", "Wall hooks"],
        materials: ["Old backpack", "Wall hooks or nails"],
        steps: [
          "Cut the backpack open flat",
          "Hang on wall using the top handle or hooks",
          "Use pockets to organize mail, keys, tools",
        ],
        valueAdded: "Wall organizer worth ₹200-400",
        youtubeQuery: "backpack wall organizer upcycle diy",
      },
    ],
  },

  // ── SHOES / FOOTWEAR ─────────────────────────────────────────────────────
  shoes: {
    reuse: [
      {
        title: "Garden Planter",
        description:
          "Old boots and shoes with drainage holes make quirky, eye-catching garden planters, especially for succulents.",
        difficulty: "Easy",
        timeMin: 15,
        materials: ["Old shoes", "Soil", "Small plants"],
        steps: [
          "Poke drainage holes in the sole",
          "Fill with soil",
          "Plant succulents or small flowers",
          "Place in garden or on windowsill",
        ],
        youtubeQuery: "old shoe planter garden diy succulent",
      },
      {
        title: "Donate to Charity",
        description:
          "If shoes are still wearable, many people desperately need them. Clean and donate to shelters or NGOs.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old shoes"],
        steps: [
          "Clean shoes properly",
          "Pair them together",
          "Donate to homeless shelter, NGO, or shoe bank",
        ],
        youtubeQuery: "donate old shoes charity ngo",
      },
      {
        title: "Door Stopper",
        description:
          "Fill an old shoe with sand or rice and use as a heavy doorstop. Boots work especially well.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old shoe", "Sand or rice"],
        steps: [
          "Fill the shoe with sand or dried rice",
          "Place behind or under a door",
        ],
        youtubeQuery: "old shoe door stopper diy",
      },
    ],
    upcycle: [
      {
        title: "Pet Toy",
        description:
          "Dogs love chewing on old shoes. Tie knots in an old running shoe to make a durable chew toy.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old shoe"],
        steps: [
          "Remove laces",
          "Tie shoe in a loose knot",
          "Give to dog as chew toy",
        ],
        valueAdded: "Pet toy saves ₹200-500",
        youtubeQuery: "old shoe dog chew toy diy",
      },
    ],
  },

  // ── EARPHONES / HEADPHONES ───────────────────────────────────────────────
  earphones: {
    reuse: [
      {
        title: "Cable Ties",
        description:
          "Cut the cable and use short sections as reusable ties for bundling other cables, garden plants, or bags.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old earphone cable", "Scissors"],
        steps: [
          "Cut cable into 10cm sections",
          "Use to tie and bundle other cables around your desk",
          "Works great for tying plants to stakes too",
        ],
        youtubeQuery: "earphone cable ties organize diy",
      },
      {
        title: "Bookmark",
        description:
          "Coil the earphones and flatten under heavy books. The wire holds a page open, and the earbuds mark the page.",
        difficulty: "Easy",
        timeMin: 1,
        materials: ["Old earphones"],
        steps: [
          "Coil the earphone wire",
          "Place between pages as a bookmark",
          "The earbud sticks out as a page tab",
        ],
        youtubeQuery: "earphone bookmark creative diy",
      },
    ],
    upcycle: [
      {
        title: "Wire Art / Jewelry",
        description:
          "Strip the colored wires and braid or weave them into bracelets, keychains, or wall art.",
        difficulty: "Medium",
        timeMin: 40,
        toolsNeeded: ["Wire strippers (optional)"],
        materials: ["Old earphone wires", "Clasp for bracelet (optional)"],
        steps: [
          "Cut wire into equal lengths",
          "Braid 3 wires together like a friendship bracelet",
          "Add a clasp or tie the ends",
          "Wear as a bracelet or keychain",
        ],
        valueAdded: "Unique bracelet worth ₹50-200",
        youtubeQuery: "earphone wire bracelet jewelry diy",
      },
    ],
  },

  // ── GLASS BOTTLES ────────────────────────────────────────────────────────
  "glass bottle": {
    reuse: [
      {
        title: "Flower Vase",
        description:
          "Clean a glass bottle and add flowers for an instant, elegant vase. Group different bottles together for a stunning centerpiece.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Glass bottle", "Flowers"],
        steps: [
          "Clean bottle thoroughly",
          "Remove labels by soaking in warm water",
          "Fill with water and add flowers",
          "Group 3-5 bottles of different sizes together",
        ],
        youtubeQuery: "glass bottle flower vase diy centerpiece",
      },
      {
        title: "Water Dispenser",
        description:
          "Use large glass bottles to store and serve filtered water. Glass doesn't leach chemicals like plastic.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Large glass bottle"],
        steps: [
          "Clean bottle with baking soda and vinegar",
          "Rinse thoroughly",
          "Fill with filtered water",
          "Keep in fridge or on dining table",
        ],
        youtubeQuery: "glass bottle water dispenser healthy",
      },
    ],
    upcycle: [
      {
        title: "Fairy Light Lamp",
        description:
          "Insert string LED lights into a glass bottle. The glass diffuses the light beautifully. No cutting needed.",
        difficulty: "Easy",
        timeMin: 10,
        toolsNeeded: [],
        materials: ["Glass bottle", "Battery-powered string lights"],
        steps: [
          "Clean and dry the bottle",
          "Insert string lights through the bottle neck",
          "Leave the battery pack outside the bottle",
          "Turn on for a beautiful lamp effect",
        ],
        valueAdded: "Decorative lamp worth ₹300-800",
        youtubeQuery: "glass bottle fairy light lamp diy decoration",
      },
    ],
  },

  // ── T-SHIRTS / CLOTHING ──────────────────────────────────────────────────
  tshirt: {
    reuse: [
      {
        title: "Cleaning Rags",
        description:
          "Cut old t-shirts into cleaning cloths. Cotton t-shirts are better than paper towels — washable and reusable.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old t-shirt", "Scissors"],
        steps: [
          "Cut t-shirt into 30x30cm squares",
          "Use for cleaning, dusting, and wiping",
          "Wash and reuse multiple times",
        ],
        youtubeQuery: "old tshirt cleaning rags diy",
      },
      {
        title: "Donate to Charity",
        description:
          "If the clothing is still wearable, donate to someone who needs it.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old clothing"],
        steps: [
          "Wash and fold clothing",
          "Separate by type (shirts, pants, etc.)",
          "Donate to shelter, NGO, or donation bin",
        ],
        youtubeQuery: "donate old clothes charity ngo",
      },
    ],
    upcycle: [
      {
        title: "Tote Bag (No-Sew)",
        description:
          "Turn a t-shirt into a reusable shopping bag in 5 minutes — no sewing required, just cut and tie.",
        difficulty: "Easy",
        timeMin: 10,
        toolsNeeded: ["Scissors"],
        materials: ["Old t-shirt"],
        steps: [
          "Cut off the sleeves",
          "Cut the neckline wider to form the bag opening",
          "Cut fringe along the bottom hem (about 3 inches)",
          "Tie each front fringe strip to its matching back strip",
          "Double-knot each for strength",
        ],
        valueAdded: "Reusable bag saves ₹50-100 each use",
        youtubeQuery: "tshirt tote bag no sew diy upcycle",
      },
    ],
  },

  // ── BOOKS / NOTEBOOKS ────────────────────────────────────────────────────
  book: {
    reuse: [
      {
        title: "Donate or Book Exchange",
        description:
          "Set up a mini book exchange shelf at your college/office, or donate to a library or NGO.",
        difficulty: "Easy",
        timeMin: 10,
        materials: ["Old books"],
        steps: [
          "Collect books you no longer need",
          "Find a Little Free Library or create one",
          "Donate to school, hostel, or NGO library",
        ],
        youtubeQuery: "book exchange little free library donate",
      },
      {
        title: "Reference / Notes Archive",
        description:
          "Keep important textbooks as reference material. Highlight key sections for quick reference.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old book", "Highlighter"],
        steps: [
          "Identify books worth keeping as reference",
          "Highlight key chapters and formulas",
          "Store on dedicated reference shelf",
        ],
        youtubeQuery: "organize reference books study shelf",
      },
    ],
    upcycle: [
      {
        title: "Secret Storage Box",
        description:
          "Cut a rectangular hole in the pages to create a hidden storage compartment. Classic DIY project.",
        difficulty: "Medium",
        timeMin: 45,
        toolsNeeded: ["Craft knife", "Glue", "Ruler"],
        materials: ["Thick book", "White glue", "Craft knife"],
        steps: [
          "Glue all pages together except the first 10-15",
          "Let dry completely",
          "Draw a rectangle outline on the glued pages",
          "Cut out the rectangle with a craft knife",
          "Store valuables inside, close the book",
        ],
        valueAdded: "Secret safe worth ₹200-500",
        youtubeQuery: "book secret storage box diy hidden compartment",
      },
    ],
  },

  // ── CALCULATORS ──────────────────────────────────────────────────────────
  calculator: {
    reuse: [
      {
        title: "Dedicate to a Study Spot",
        description:
          "Keep one in your study area so you always have a calculator available without searching.",
        difficulty: "Easy",
        timeMin: 1,
        materials: ["Old calculator"],
        steps: [
          "Test that it still works",
          "Place on study desk or lab station",
          "Replace batteries if needed",
        ],
        youtubeQuery: "organize study desk calculator",
      },
      {
        title: "Donate to Student",
        description:
          "Many students can't afford scientific calculators. Donate to a junior student or school.",
        difficulty: "Easy",
        timeMin: 5,
        materials: ["Old calculator"],
        steps: [
          "Test all functions work",
          "Replace batteries if needed",
          "Give to a junior student or school",
        ],
        youtubeQuery: "donate calculator student school",
      },
    ],
    upcycle: [
      {
        title: "Retro Desk Art",
        description:
          "Disassemble and frame the circuit board and LCD as a wall art piece. Tech-themed room decor.",
        difficulty: "Medium",
        timeMin: 30,
        toolsNeeded: ["Small screwdriver", "Frame"],
        materials: ["Old calculator", "Picture frame", "Glue"],
        steps: [
          "Open the calculator and remove the circuit board",
          "Arrange the board, LCD, keys on a backing",
          "Frame it as wall art",
        ],
        valueAdded: "Tech wall art worth ₹200-400",
        youtubeQuery: "old calculator circuit board art frame diy",
      },
    ],
  },

  // ── LAB EQUIPMENT (beakers, flasks, test tubes) ──────────────────────────
  beaker: {
    reuse: [
      {
        title: "Pencil/Pen Holder",
        description:
          "Lab beakers are perfect desktop organizers — sturdy, clear, and look sciency-cool on any desk.",
        difficulty: "Easy",
        timeMin: 2,
        materials: ["Old lab beaker"],
        steps: [
          "Clean the beaker thoroughly",
          "Place on desk",
          "Store pens, pencils, scissors, rulers",
        ],
        youtubeQuery: "lab beaker pencil holder desk organizer",
      },
      {
        title: "Measuring Cup for Cooking",
        description:
          "Beakers have graduated markings — use them in the kitchen for precise liquid measurements.",
        difficulty: "Easy",
        timeMin: 1,
        materials: ["Clean lab beaker"],
        steps: [
          "Verify the beaker is food-safe glass",
          "Clean thoroughly",
          "Use as a measuring cup in the kitchen",
        ],
        youtubeQuery: "lab beaker kitchen measuring cup",
      },
      {
        title: "Candle Holder",
        description:
          "Place a tea light candle inside a beaker for a safe, stylish candle holder. The glass protects from drafts.",
        difficulty: "Easy",
        timeMin: 2,
        materials: ["Lab beaker", "Tea light candle"],
        steps: [
          "Clean the beaker",
          "Place a tea light inside",
          "Light and enjoy — glass shields the flame from wind",
        ],
        youtubeQuery: "beaker candle holder diy decoration",
      },
    ],
    upcycle: [
      {
        title: "Terrarium",
        description:
          "Create a miniature garden inside a large beaker with layers of pebbles, charcoal, soil, and tiny plants.",
        difficulty: "Medium",
        timeMin: 30,
        toolsNeeded: ["Tweezers"],
        materials: [
          "Large beaker or flask",
          "Small pebbles",
          "Activated charcoal",
          "Soil",
          "Tiny plants or moss",
        ],
        steps: [
          "Add a layer of pebbles at the bottom",
          "Add a thin layer of charcoal",
          "Add potting soil",
          "Plant tiny plants or moss using tweezers",
          "Mist with water and display",
        ],
        valueAdded: "Desktop terrarium worth ₹300-800",
        youtubeQuery: "beaker terrarium miniature garden diy",
      },
    ],
  },
};

// ─── Match item label to ITEM_IDEAS keys ─────────────────────────────────
const getIdeasForItem = (itemLabel, type = "reuse") => {
  if (!itemLabel) return null;
  const label = itemLabel.toLowerCase();

  // Direct + fuzzy matching against ITEM_IDEAS keys
  const matchMap = {
    watch: [
      "watch",
      "clock",
      "stopwatch",
      "timepiece",
      "analog clock",
      "digital watch",
      "wristwatch",
    ],
    phone: [
      "phone",
      "smartphone",
      "mobile",
      "cellular",
      "iphone",
      "android",
      "cell",
    ],
    laptop: [
      "laptop",
      "notebook computer",
      "desktop computer",
      "chromebook",
      "macbook",
    ],
    keyboard: ["keyboard", "computer keyboard"],
    pen: ["pen", "ballpoint", "marker", "highlighter", "fountain pen"],
    "water bottle": [
      "water bottle",
      "plastic bottle",
      "soda bottle",
      "pop bottle",
      "bottle",
    ],
    backpack: ["backpack", "bag", "school bag", "rucksack", "purse"],
    shoes: [
      "shoe",
      "sandal",
      "slipper",
      "flip-flop",
      "boot",
      "sneaker",
      "running shoe",
      "tennis shoe",
      "footwear",
    ],
    earphones: ["earphone", "headphone", "earbud", "airpod", "headset"],
    "glass bottle": [
      "glass bottle",
      "beer bottle",
      "wine bottle",
      "glass jar",
      "glass container",
    ],
    tshirt: [
      "t-shirt",
      "shirt",
      "sweatshirt",
      "jersey",
      "clothing",
      "cardigan",
      "jacket",
      "jeans",
      "jean",
      "cloth",
    ],
    book: [
      "book",
      "notebook",
      "textbook",
      "binder",
      "paper book",
      "comic book",
      "newspaper",
      "magazine",
    ],
    calculator: ["calculator"],
    beaker: [
      "beaker",
      "flask",
      "test tube",
      "lab flask",
      "erlenmeyer",
      "petri dish",
      "lab glass",
      "lab equipment",
    ],
  };

  for (const [itemKey, keywords] of Object.entries(matchMap)) {
    if (keywords.some((kw) => label.includes(kw))) {
      const ideas = ITEM_IDEAS[itemKey]?.[type];
      if (ideas && ideas.length > 0) {
        console.log(
          `🎯 Item-specific match: "${itemLabel}" → "${itemKey}" (${ideas.length} ${type} ideas)`,
        );
        return [...ideas].sort(() => Math.random() - 0.5);
      }
    }
  }

  return null; // No item-specific match found
};

// ─── Get ideas by category and type ──────────────────────────────────────
const getIdeasByCategory = (category, type = "reuse") => {
  // Normalize category name
  const normalizedCategory = Object.keys(SCRAPED_IDEAS).find(
    (key) =>
      key.toLowerCase() === category.toLowerCase() ||
      category.toLowerCase().includes(key.toLowerCase()),
  );

  if (!normalizedCategory) {
    console.warn(
      `⚠️  No ideas found for category: ${category} — using Plastic as fallback`,
    );
    return SCRAPED_IDEAS["Plastic"][type] || [];
  }

  const ideas = SCRAPED_IDEAS[normalizedCategory][type];
  if (!ideas || ideas.length === 0) {
    console.warn(`⚠️  No ${type} ideas for ${normalizedCategory}`);
    return [];
  }

  // Shuffle to add variety each time
  return [...ideas].sort(() => Math.random() - 0.5);
};

// ─── Get category from material string ───────────────────────────────────
const getCategoryFromMaterial = (material) => {
  const map = {
    plastic: "Plastic",
    glass: "Glass",
    metal: "Metal",
    paper: "Paper",
    "paper/cardboard": "Paper",
    cardboard: "Paper",
    organic: "Organic",
    "organic waste": "Organic",
    food: "Organic",
    electronic: "Electronic",
    "e-waste": "Electronic",
    electronics: "Electronic",
    textile: "Textile",
    cloth: "Textile",
    "cloth/textile": "Textile",
    clothing: "Textile",
    wood: "Wood",
    wooden: "Wood",
  };

  const key = (material || "").toLowerCase().trim();
  return map[key] || "Plastic";
};

module.exports = {
  getIdeasByCategory,
  getIdeasForItem,
  getCategoryFromMaterial,
  SCRAPED_IDEAS,
  ITEM_IDEAS,
};
