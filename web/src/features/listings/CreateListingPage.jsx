// Give an item away. Reachable directly or from a scan result, in which case the
// detected material preselects a category.

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, listingsAPI } from "@/lib/api";
import { CATEGORIES, MATERIAL_TO_CATEGORY, UNITS } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [form, setForm] = useState({
    title: state?.label && state.label !== `${state?.material} item` ? state.label : "",
    description: "",
    category: MATERIAL_TO_CATEGORY[state?.material] || "",
    quantity: "1",
    unit: "items",
    pickupLocation: "",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  function addImages(event) {
    const picked = Array.from(event.target.files || []).slice(0, 5 - images.length);
    event.target.value = "";
    if (!picked.length) return;
    setImages((prev) => [...prev, ...picked]);
    setPreviews((prev) => [...prev, ...picked.map((file) => URL.createObjectURL(file))]);
  }

  function removeImage(index) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Mirrors listingValidation in backend/routes/listings.js, so the user sees the
    // rule before the round trip rather than a generic 400 afterwards.
    if (form.title.trim().length < 3) return toast.error("Title must be at least 3 characters");
    if (form.description.trim().length < 10) return toast.error("Description must be at least 10 characters");
    if (!form.category) return toast.error("Pick a category");
    if (!(Number(form.quantity) > 0)) return toast.error("Quantity must be greater than 0");
    if (form.pickupLocation.trim().length < 3) return toast.error("Pickup location must be at least 3 characters");

    setSubmitting(true);
    try {
      // multipart, because the route runs multer via upload.array("images", 5).
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      images.forEach((file) => payload.append("images", file));

      const { data } = await listingsAPI.create(payload);
      toast.success("Item posted");
      navigate(data?.listing?._id ? `/listings/${data.listing._id}` : "/listings/mine");
    } catch (error) {
      // express-validator returns a field-level array; that message is far more
      // useful than the generic one.
      const details = error?.response?.data?.errors?.[0]?.msg;
      toast.error(details || errorMessage(error, "Could not post the item"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Give an item</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Someone nearby may need what you no longer do.
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={update("title")}
                placeholder="Steel water bottle"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={update("description")}
                placeholder="Condition, size, and why you are giving it away"
                required
              />
              <div className="text-right text-[11.5px] tabular-nums text-muted-foreground">
                {form.description.length}/500
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: entry.value }))}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors",
                      form.category === entry.value
                        ? "border-accent bg-accent-tint text-accent"
                        : "border-border hover:bg-secondary",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={update("quantity")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  value={form.unit}
                  onChange={update("unit")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {UNITS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pickupLocation">Pickup location</Label>
              <Input
                id="pickupLocation"
                value={form.pickupLocation}
                onChange={update("pickupLocation")}
                placeholder="Area or landmark, not your full address"
                required
              />
              <p className="text-[12px] text-muted-foreground">
                Keep it approximate. Exact details are shared only once a pickup is arranged.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Photos <span className="text-muted-foreground">(up to 5)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {previews.map((src, index) => (
                  <div key={src} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:bg-secondary">
                    <Upload className="h-4 w-4" />
                    <span className="text-[11px]">Add</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
                  </label>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post item
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
