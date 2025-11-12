"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  source: string;
  url: string;
  price: number;
  currency: string;
  inStock: boolean;
  distributorName?: string;
}

interface SearchStatus {
  status: "idle" | "searching" | "scraping" | "completed" | "error";
  message: string;
  results?: SearchResult[];
  newDistributors?: Array<{
    id: string;
    name: string;
    website: string;
    productCount: number;
  }>;
}

export function EquipmentSearchPrompt({
  onDistributorAdded,
}: {
  onDistributorAdded?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    status: "idle",
    message: "",
  });

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter an equipment search term");
      return;
    }

    setSearchStatus({
      status: "searching",
      message: "Searching the web for equipment and comparing prices...",
    });
    setIsOpen(true);

    try {
      const response = await fetch("/api/equipment/search-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Search failed");
      }

      setSearchStatus({
        status: data.scraping ? "scraping" : "completed",
        message: data.scraping
          ? "Found sources! Scraping distributor data and products..."
          : "Search completed",
        results: data.results || [],
        newDistributors: data.newDistributors || [],
      });

      if (data.newDistributors && data.newDistributors.length > 0) {
        toast.success(
          `Found ${data.newDistributors.length} new distributor(s) and scraped their products!`,
        );
        onDistributorAdded?.();
      } else if (data.results && data.results.length > 0) {
        toast.success(`Found ${data.results.length} price comparison result(s)`);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to search. Please try again.",
      });
      toast.error("Search failed. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="relative">
      {/* Search Input Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search equipment online (e.g., 'solar panels 400W')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-9 pr-10 bg-white border-gray-200"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={searchStatus.status === "searching" || searchStatus.status === "scraping"}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {searchStatus.status === "searching" || searchStatus.status === "scraping" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Search Web
            </>
          )}
        </Button>
      </div>

      {/* Results Panel */}
      {isOpen && searchStatus.status !== "idle" && (
        <Card className="absolute top-full mt-2 right-0 w-full max-w-2xl z-50 bg-white border-gray-200 shadow-lg max-h-[600px] overflow-y-auto">
          <div className="p-4">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {searchStatus.status === "searching" || searchStatus.status === "scraping" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : searchStatus.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : searchStatus.status === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : null}
                <h3 className="font-semibold text-gray-900">Search Results</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setSearchStatus({ status: "idle", message: "" });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Status Message */}
            <p className="text-sm text-gray-600 mb-4">{searchStatus.message}</p>

            {/* New Distributors */}
            {searchStatus.newDistributors && searchStatus.newDistributors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">New Distributors Added:</h4>
                <div className="space-y-2">
                  {searchStatus.newDistributors.map((dist) => (
                    <div
                      key={dist.id}
                      className="p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{dist.name}</p>
                          <p className="text-sm text-gray-600">
                            {dist.productCount} products scraped
                          </p>
                        </div>
                        <a
                          href={dist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Comparison Results */}
            {searchStatus.results && searchStatus.results.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Price Comparison:</h4>
                <div className="space-y-2">
                  {searchStatus.results
                    .sort((a, b) => a.price - b.price)
                    .map((result, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">{result.source}</p>
                              {result.distributorName && (
                                <Badge variant="outline" className="text-xs">
                                  {result.distributorName}
                                </Badge>
                              )}
                              {result.inStock ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  In Stock
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Out of Stock
                                </Badge>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                              {result.currency}
                              {result.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {searchStatus.status === "error" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{searchStatus.message}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

