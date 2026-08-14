// Mirrors listingValidation in backend/routes/listings.js.
//
// The validator's category list is narrower than the Listing model's enum, and it
// is the validator that rejects requests — so this follows the validator. Sending
// a category the model allows but the validator does not produces a 400 that reads
// like a client bug.
export const CATEGORIES = [
  { value: "produce", label: "Fresh produce" },
  { value: "canned-goods", label: "Canned goods" },
  { value: "dairy", label: "Dairy" },
  { value: "bakery", label: "Bakery" },
  { value: "household-items", label: "Household items" },
  { value: "clothing", label: "Clothing" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "books", label: "Books" },
  { value: "other", label: "Other" },
];

export const UNITS = [
  { value: "items", label: "Items" },
  { value: "kg", label: "Kilograms" },
  { value: "lbs", label: "Pounds" },
  { value: "bags", label: "Bags" },
  { value: "boxes", label: "Boxes" },
  { value: "servings", label: "Servings" },
];

// Scanner materials map onto listing categories where the mapping is honest.
// Organic and Hazardous are deliberately absent: food waste is not a giveaway and
// hazardous items must not be passed to another household.
export const MATERIAL_TO_CATEGORY = {
  Plastic: "household-items",
  Glass: "household-items",
  Metal: "household-items",
  Paper: "books",
  Electronic: "electronics",
  Textile: "clothing",
  Wood: "furniture",
};

export const STATUS_TONE = {
  available: "border-green-300 bg-green-50 text-green-800",
  assigned: "border-blue-300 bg-blue-50 text-blue-800",
  pending: "border-amber-300 bg-amber-50 text-amber-800",
  completed: "border-slate-300 bg-slate-100 text-slate-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-500",
};

export const categoryLabel = (value) =>
  CATEGORIES.find((entry) => entry.value === value)?.label || value;
