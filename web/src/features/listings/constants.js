// Mirrors LISTING_CATEGORIES in backend/routes/listings.js.
//
// The validator is what rejects a request, so this follows the validator rather
// than the model's enum. Sending a category the model allows but the validator
// does not produces a 400 that reads like a client bug.
//
// The nine food categories this list used to carry — produce, dairy, bakery and
// the rest — were inherited from the food-donation app this started as. No listing
// has ever used one, and on a waste platform they read as a mistake.
export const CATEGORIES = [
  { value: "household-items", label: "Household items" },
  { value: "clothing", label: "Clothing" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "books", label: "Books and paper" },
  { value: "toys", label: "Toys" },
  { value: "sports", label: "Sports gear" },
  { value: "scrap-materials", label: "Scrap materials" },
  { value: "other", label: "Other" },
];

// "servings" is food-shaped and stays only because the backend enum still accepts
// it and older rows may carry it. It is not offered when creating a listing.
export const UNITS = [
  { value: "items", label: "Items" },
  { value: "kg", label: "Kilograms" },
  { value: "bags", label: "Bags" },
  { value: "boxes", label: "Boxes" },
];

// Scanner materials map onto listing categories where the mapping is honest, so a
// scan can pre-fill the listing form.
//
// Organic and Hazardous are deliberately absent: food waste is not a giveaway, and
// hazardous items must not be passed to another household.
//
// Plastic, Glass, Metal and Paper go to scrap-materials rather than to
// household-items and books. A scanned sheet of paper is not a book, and a scanned
// bottle is material sold by weight, not a household item someone wants. Anyone
// listing a genuinely reusable container can change the category on the form.
export const MATERIAL_TO_CATEGORY = {
  Plastic: "scrap-materials",
  Glass: "scrap-materials",
  Metal: "scrap-materials",
  Paper: "scrap-materials",
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
