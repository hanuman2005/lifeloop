// backend/controllers/mapController.js
// Handles: Nearest recycling centers, kabadiwala, donation centers
// Uses MongoDB geospatial queries — no Google Maps API needed
// Seed data covers major Indian cities

const RecyclingCenter = require("../models/RecyclingCenter");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/map/nearby?lat=16.43&lng=81.67&category=Plastic&radius=10
// Find nearest centers that accept the specified waste category
// ─────────────────────────────────────────────────────────────────────────────
const getNearby = async (req, res) => {
  try {
    const { lat, lng, category, radius = 15, type } = req.query;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ success: false, error: "lat and lng are required" });
    }

    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(radius) * 1000, // convert km to meters
        },
      },
    };

    if (category) query.accepts = category;
    if (type) query.type = type;

    const centers = await RecyclingCenter.find(query).limit(20);

    return res.json({
      success: true,
      data: centers
        .map((c) => ({
          id: c._id,
          name: c.name,
          type: c.type,
          address: c.address,
          city: c.city,
          phone: c.phone,
          accepts: c.accepts,
          hours: c.hours,
          pricePerKg: c.pricePerKg,
          isVerified: c.isVerified,
          rating: c.rating,
          coordinates: c.location.coordinates,
          // Calculate rough distance
          distance: calcDistance(
            parseFloat(lat),
            parseFloat(lng),
            c.location.coordinates[1],
            c.location.coordinates[0],
          ),
        }))
        .sort((a, b) => a.distance - b.distance),
    });
  } catch (err) {
    console.error("getNearby error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/map/prices?category=Metal
// Get current prices for recyclables by category
// ─────────────────────────────────────────────────────────────────────────────
const getPrices = async (req, res) => {
  // Static current market prices (update periodically)
  // Source: kabadiwala market rates, Feb 2026
  const PRICES = {
    Plastic: {
      "PET Bottles (clean)": "₹8-12/kg",
      "HDPE (hard plastic)": "₹15-20/kg",
      "Plastic bags": "₹2-5/kg",
      "Mixed plastic": "₹3-7/kg",
    },
    Metal: {
      "Aluminum cans": "₹80-100/kg",
      "Copper wire": "₹400-450/kg",
      "Iron/Steel": "₹25-35/kg",
      Brass: "₹280-320/kg",
      "Stainless steel": "₹40-55/kg",
    },
    Paper: {
      Newspaper: "₹10-14/kg",
      "Cardboard/Cartons": "₹8-12/kg",
      "Office paper": "₹12-16/kg",
      Magazines: "₹6-8/kg",
    },
    Glass: {
      "Clear glass bottles": "₹1-2/kg",
      "Colored glass": "₹0.5-1/kg",
    },
    Electronic: {
      "Mobile phones": "₹50-500/piece",
      Laptops: "₹500-3000/piece",
      "Cables/wires (copper)": "₹200-350/kg",
      "PCBs/circuit boards": "₹100-200/kg",
    },
  };

  const { category } = req.query;
  return res.json({
    success: true,
    prices: category ? PRICES[category] || {} : PRICES,
    lastUpdated: "February 2026",
    note: "Prices vary by condition, quantity, and local market. Contact kabadiwala to confirm.",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/map/seed
// Seed database with recycling centers (run once)
// Admin only
// ─────────────────────────────────────────────────────────────────────────────
const seedCenters = async (req, res) => {
  try {
    const centers = [
      // ── Andhra Pradesh ───────────────────────────────────────────────────
      {
        name: "Attero Recycling - Vijayawada",
        type: "ewaste",
        address: "Auto Nagar, Vijayawada",
        city: "Vijayawada",
        phone: "1800-419-4243",
        website: "https://attero.in",
        accepts: ["Electronic", "Metal"],
        hours: "Mon-Sat 9AM-6PM",
        isVerified: true,
        location: { type: "Point", coordinates: [80.648, 16.5062] },
        pricePerKg: { Electronic: 50, Metal: 30 },
      },
      {
        name: "Goonj Collection Point - Vijayawada",
        type: "donation",
        address: "Benz Circle, Vijayawada",
        city: "Vijayawada",
        phone: "011-41401216",
        website: "https://goonj.org",
        accepts: ["Textile", "Paper", "Plastic", "Wood"],
        hours: "Mon-Sat 10AM-5PM",
        isVerified: true,
        location: { type: "Point", coordinates: [80.62, 16.51] },
      },
      {
        name: "Kabadiwala - Narasapur",
        type: "kabadiwala",
        address: "Market Area, Narasapur",
        city: "Narasapur",
        phone: "+91-9848000001",
        accepts: ["Plastic", "Metal", "Paper", "Glass"],
        hours: "Daily 8AM-7PM",
        isVerified: false,
        location: { type: "Point", coordinates: [81.6918, 16.4329] },
        pricePerKg: { Plastic: 8, Metal: 30, Paper: 10, Glass: 1 },
      },
      {
        name: "E-Parisaraa - Hyderabad",
        type: "ewaste",
        address: "IDA Jeedimetla, Hyderabad",
        city: "Hyderabad",
        phone: "080-28432580",
        website: "https://e-parisaraa.com",
        accepts: ["Electronic"],
        hours: "Mon-Fri 9AM-5PM",
        isVerified: true,
        location: { type: "Point", coordinates: [78.4867, 17.385] },
      },
      {
        name: "Kabadiwala - Hyderabad Jubilee Hills",
        type: "kabadiwala",
        address: "Jubilee Hills, Hyderabad",
        city: "Hyderabad",
        phone: "+91-9848000002",
        accepts: ["Plastic", "Metal", "Paper", "Glass"],
        hours: "Daily 7AM-8PM",
        isVerified: false,
        location: { type: "Point", coordinates: [78.4095, 17.4319] },
        pricePerKg: { Plastic: 10, Metal: 35, Paper: 12, Glass: 1 },
      },
      {
        name: "Municipal Composting Center - Vijayawada",
        type: "compost",
        address: "Krishnalanka, Vijayawada",
        city: "Vijayawada",
        phone: "0866-2577777",
        accepts: ["Organic"],
        hours: "Daily 6AM-6PM",
        isVerified: true,
        location: { type: "Point", coordinates: [80.61, 16.52] },
      },
      {
        name: "Rotary Club Donation Center - Eluru",
        type: "donation",
        address: "Main Road, Eluru",
        city: "Eluru",
        accepts: ["Textile", "Wood", "Electronic", "Paper"],
        hours: "Sat-Sun 10AM-4PM",
        isVerified: false,
        location: { type: "Point", coordinates: [81.0952, 16.7107] },
      },

      // ── Pan-India Major Centers ───────────────────────────────────────
      {
        name: "Attero Recycling HQ - Delhi",
        type: "ewaste",
        address: "Roorkee, Uttarakhand (pickup service Delhi)",
        city: "Delhi",
        phone: "1800-419-4243",
        website: "https://attero.in",
        accepts: ["Electronic", "Metal"],
        hours: "Mon-Sat 9AM-6PM",
        isVerified: true,
        location: { type: "Point", coordinates: [77.209, 28.6139] },
      },
      {
        name: "Kabadiwala.com - Mumbai",
        type: "kabadiwala",
        address: "Pan-Mumbai pickup service",
        city: "Mumbai",
        phone: "1800-270-2233",
        website: "https://kabadiwala.com",
        accepts: ["Plastic", "Metal", "Paper", "Glass", "Electronic"],
        hours: "Mon-Sat 8AM-8PM",
        isVerified: true,
        location: { type: "Point", coordinates: [72.8777, 19.076] },
        pricePerKg: {
          Plastic: 12,
          Metal: 40,
          Paper: 14,
          Glass: 1,
          Electronic: 60,
        },
      },
      {
        name: "SWaCH Cooperative - Pune",
        type: "recycler",
        address: "Kothrud, Pune",
        city: "Pune",
        phone: "020-25385099",
        website: "https://swachcoop.com",
        accepts: ["Plastic", "Glass", "Metal", "Paper", "Organic"],
        hours: "Mon-Sat 8AM-6PM",
        isVerified: true,
        location: { type: "Point", coordinates: [73.8567, 18.5204] },
      },
    ];

    // Clear existing and insert fresh
    await RecyclingCenter.deleteMany({});
    await RecyclingCenter.insertMany(centers);

    return res.json({
      success: true,
      message: `Seeded ${centers.length} recycling centers`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Haversine distance formula (km) ─────────────────────────────────────────
const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

module.exports = { getNearby, getPrices, seedCenters };
