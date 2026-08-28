import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { listingsAPI } from "@/lib/api";
import ListingCard from "@/features/listings/ListingCard";
import { CATEGORIES } from "@/features/listings/constants";
import { cn } from "@/lib/utils";

export default function ListingsPage() {
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", category],
    queryFn: async () =>
      (await listingsAPI.getAll({ status: "available", limit: 60, ...(category ? { category } : {}) })).data,
  });

  const listings = data?.listings || [];
  const term = search.trim().toLowerCase();
  const visible = term
    ? listings.filter(
        (l) =>
          l.title?.toLowerCase().includes(term) || l.description?.toLowerCase().includes(term),
      )
    : listings;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Exchange</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Items nearby looking for a second owner.
          </p>
        </div>
        <Button variant="accent" asChild>
          <Link to="/listings/new"><Plus className="mr-2 h-4 w-4" />Give an item</Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items"
          className="pl-9 h-11"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[12.5px] font-medium transition-all",
            !category ? "border-accent bg-accent-tint text-accent shadow-sm" : "border-border hover:bg-secondary hover:border-accent/30",
          )}
        >
          All
        </button>
        {CATEGORIES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setCategory(entry.value === category ? null : entry.value)}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[12.5px] font-medium transition-all",
              category === entry.value
                ? "border-accent bg-accent-tint text-accent shadow-sm"
                : "border-border hover:bg-secondary hover:border-accent/30",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState label="Loading items" />}
      {isError && <EmptyState title="Could not load items" description="Check your connection and try again." />}
      {!isLoading && !isError && visible.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          description={term ? "No items match that search." : "Be the first to give an item away."}
          action={<Button variant="accent" asChild><Link to="/listings/new">Give an item</Link></Button>}
        />
      )}

      {visible.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
