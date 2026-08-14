import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { listingsAPI } from "@/lib/api";
import ListingCard from "@/features/listings/ListingCard";

export default function MyListingsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-listings"],
    queryFn: async () => (await listingsAPI.getUserListings()).data,
  });

  const listings = data?.listings || [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">My items</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Everything you have offered, and where each one has got to.
          </p>
        </div>
        <Button asChild>
          <Link to="/listings/new"><Plus className="mr-2 h-4 w-4" />Give an item</Link>
        </Button>
      </header>

      {isLoading && <LoadingState label="Loading your items" />}
      {isError && <EmptyState title="Could not load your items" description="Check your connection and try again." />}

      {!isLoading && !isError && listings.length === 0 && (
        <EmptyState
          title="You have not offered anything yet"
          description="Scan an item to find out what it is made of, then give it away instead of binning it."
          action={<Button asChild><Link to="/scan">Scan an item</Link></Button>}
        />
      )}

      {listings.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
