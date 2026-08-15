// Rate the other party after a completed exchange.
//
// Kept to a star and an optional sentence. Asking more of someone who has just
// finished a two-minute doorstep handover gets fewer ratings, not better ones,
// and the rating exists to build enough trust for the next exchange rather than
// to produce a review corpus.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, ratingsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Below expectations", "Fine", "Good", "Excellent"];

export default function RateUserDialog({ open, onOpenChange, user, listingId, onRated }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      ratingsAPI.rate(user?._id || user?.id, {
        rating,
        review: review.trim() || undefined,
        ...(listingId ? { listingId } : {}),
      }),
    onSuccess: () => {
      toast.success("Thanks — your rating helps the next person");
      onRated?.();
      onOpenChange(false);
      setRating(0);
      setReview("");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not submit the rating")),
  });

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "this person";
  const shown = hovered || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {name}</DialogTitle>
          <DialogDescription>
            How did the exchange go? Only the star is required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-7 w-7",
                      value <= shown
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="h-4 text-[12.5px] text-muted-foreground">{LABELS[shown]}</span>
          </div>

          <Textarea
            value={review}
            onChange={(event) => setReview(event.target.value.slice(0, 500))}
            placeholder="Anything worth saying? (optional)"
            rows={3}
          />

          <Button
            className="w-full"
            disabled={rating === 0 || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
