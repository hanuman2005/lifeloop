// Everything this person has offered, grouped by where it has got to.
//
// A flat grid answered "what did I list" but not "what needs me" — an item someone
// is waiting on looked exactly like one that was collected last week. Status tabs
// with counts put the answer in the tab bar, before anything is clicked.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { PageHeader } from "@/shared/components/PageHeader";
import { listingsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import ListingCard from "@/features/listings/ListingCard";

// Ordered by how much attention each state needs, not alphabetically. "Waiting" is
// where someone has shown interest and the owner has to act.
const TABS = [
  { value: "all", label: "All", match: () => true },
  { value: "available", label: "Available", match: (l) => l.status === "available" },
  {
    value: "waiting",
    label: "Waiting on you",
    match: (l) => l.status === "assigned" || l.status === "pending",
  },
  { value: "completed", label: "Collected", match: (l) => l.status === "completed" },
];

export default function MyListingsPage() {
  const [tab, setTab] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-listings"],
    queryFn: async () => (await listingsAPI.getUserListings()).data,
  });

  const listings = data?.listings || [];
  const active = TABS.find((entry) => entry.value === tab) || TABS[0];
  const visible = listings.filter(active.match);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My items"
        description="Everything you have offered, and where each one has got to."
        action={
          <Button variant="accent" asChild>
            <Link to="/listings/new">
              <Plus className="mr-2 h-4 w-4" />
              Give an item
            </Link>
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading your items" />}
      {isError && (
        <EmptyState
          title="Could not load your items"
          description="Check your connection and try again."
        />
      )}

      {!isLoading && !isError && listings.length === 0 && (
        <EmptyState
          title="You have not offered anything yet"
          description="Scan an item to find out what it is made of, then give it away instead of binning it."
          action={
            <Button variant="accent" asChild>
              <Link to="/scan">Scan an item</Link>
            </Button>
          }
        />
      )}

      {listings.length > 0 && (
        <>
          {/* Counts live in the tab so the state of everything is legible without
              selecting each one in turn. */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((entry) => {
              const count = listings.filter(entry.match).length;
              return (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setTab(entry.value)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] transition-colors",
                    tab === entry.value
                      ? "border-accent bg-accent-tint text-accent"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  {entry.label}
                  <span className="font-mono tabular-nums opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={`Nothing ${active.label.toLowerCase()}`}
              description="Try another tab to see the rest of your items."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
