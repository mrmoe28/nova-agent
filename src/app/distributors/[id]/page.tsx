"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EquipmentCardSkeleton } from "@/components/skeleton-loaders";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getAllCategories, getCategoryDisplayName } from "@/lib/categorize-product";
import type { EquipmentCategory } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Package,
  Star,
  ExternalLink,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Distributor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  logoUrl?: string;
  rating?: number;
  shippingInfo?: string;
  paymentTerms?: string;
  lastScrapedAt?: string;
  createdAt: string;
  equipment: Equipment[];
}

interface Equipment {
  id: string;
  category: EquipmentCategory;
  name: string;
  manufacturer?: string;
  modelNumber: string;
  description?: string;
  unitPrice: number;
  imageUrl?: string;
  sourceUrl?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

export default function DistributorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const distributorId = params.id as string;

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [useBrowser, setUseBrowser] = useState(false); // Browser mode - requires valid Browserless token
  const [showAddUrlDialog, setShowAddUrlDialog] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [scrapingStatus, setScrapingStatus] = useState("");

  // Filter equipment by category
  const filteredEquipment = useMemo(() => {
    if (!distributor?.equipment) return [];
    if (selectedCategory === "all") return distributor.equipment;
    return distributor.equipment.filter(
      (item) => item.category === selectedCategory
    );
  }, [distributor?.equipment, selectedCategory]);

  const fetchDistributor = useCallback(async () => {
    try {
      const response = await fetch(`/api/distributors/${distributorId}`);
      const data = await response.json();

      if (data.success) {
        setDistributor(data.distributor);
      }
    } catch (error) {
      console.error("Error fetching distributor:", error);
    } finally {
      setLoading(false);
    }
  }, [distributorId]);

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  const handleRescrape = async () => {
    if (!distributor?.website) {
      alert("No website URL found for this distributor");
      return;
    }

    setScraping(true);
    setScrapingProgress(0);
    setScrapingStatus("Initializing scraper...");

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setScrapingProgress((prev) => {
        if (prev >= 90) return prev; // Cap at 90% until complete
        return prev + 5;
      });
    }, 2000);

    try {
      setScrapingStatus("Connecting to distributor website...");
      const response = await fetch("/api/distributors/scrape-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: distributor.website,
          saveToDatabase: true,
          scrapeProducts: true,
          distributorId: distributor.id,
          maxProducts: 500,
          useBrowser, // Use browser mode if enabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully rescraped! Found ${data.productsFound} products. Refreshing...`,
        );
        // Add delay to ensure database transaction commits before fetching
        setTimeout(() => {
          fetchDistributor();
        }, 1000); // Wait 1 second for DB transaction to complete
      } else {
        alert(`Rescrape failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error rescraping:", error);
      alert("Failed to rescrape distributor");
    } finally {
      clearInterval(progressInterval);
      setScrapingProgress(100);
      setScrapingStatus("Complete!");
      setScraping(false);
      // Reset progress after a delay
      setTimeout(() => {
        setScrapingProgress(0);
        setScrapingStatus("");
      }, 2000);
    }
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) {
      alert("Please enter a URL");
      return;
    }

    if (!distributor) return;

    setScraping(true);
    setShowAddUrlDialog(false);

    try {
      const response = await fetch("/api/distributors/scrape-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl,
          saveToDatabase: true,
          scrapeProducts: true,
          distributorId: distributor.id,
          maxProducts: 500,
          useBrowser,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully scraped new URL! Found ${data.productsFound} products. Refreshing...`,
        );
        setNewUrl(""); // Clear the input
        setTimeout(() => {
          fetchDistributor();
        }, 1000);
      } else {
        alert(`Scrape failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error scraping new URL:", error);
      alert("Failed to scrape new URL");
    } finally {
      setScraping(false);
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    try {
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchDistributor();
      } else {
        alert("Failed to delete equipment");
      }
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("Failed to delete equipment");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Distributor not found</p>
        <Button onClick={() => router.push("/distributors")} className="mt-4">
          Back to Distributors
        </Button>
      </div>
    );
  }

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div className="w-full px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/distributors")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Distributors
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex gap-6">
            {distributor.logoUrl && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border bg-white">
                <Image
                  src={distributor.logoUrl}
                  alt={distributor.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{distributor.name}</h1>
              {distributor.rating && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(distributor.rating!)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {distributor.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {distributor.lastScrapedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last scraped:{" "}
                  {new Date(distributor.lastScrapedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {distributor.website && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useBrowser}
                    onChange={(e) => setUseBrowser(e.target.checked)}
                    className="w-4 h-4"
                    disabled={scraping}
                  />
                  <span className="text-muted-foreground">
                    Browser Mode (extracts product images, slower but more
                    accurate)
                  </span>
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddUrlDialog(true)}
                disabled={scraping}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Add URL
              </Button>
              {distributor.website && (
                <Button
                  variant="outline"
                  onClick={handleRescrape}
                  disabled={scraping}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${scraping ? "animate-spin" : ""}`}
                  />
                  {scraping ? "Scraping..." : "Rescrape"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scraping Progress Bar */}
        {scraping && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {scrapingStatus}
              </span>
              <span className="text-muted-foreground">
                {scrapingProgress}%
              </span>
            </div>
            <Progress value={scrapingProgress} className="h-2" />
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="space-y-3">
            {distributor.contactName && (
              <div className="text-sm">
                <span className="font-medium">Contact:</span>{" "}
                {distributor.contactName}
              </div>
            )}
            {distributor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${distributor.email}`}
                  className="text-blue-600"
                >
                  {distributor.email}
                </a>
              </div>
            )}
            {distributor.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${distributor.phone}`}>{distributor.phone}</a>
              </div>
            )}
            {distributor.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={distributor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 flex items-center gap-1"
                >
                  Visit Website <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {distributor.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{distributor.address}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Business Information</h2>
          <div className="space-y-3">
            {distributor.shippingInfo && (
              <div className="text-sm">
                <span className="font-medium">Shipping:</span>{" "}
                {distributor.shippingInfo}
              </div>
            )}
            {distributor.paymentTerms && (
              <div className="text-sm">
                <span className="font-medium">Payment Terms:</span>{" "}
                {distributor.paymentTerms}
              </div>
            )}
            {distributor.notes && (
              <div className="text-sm">
                <span className="font-medium">Notes:</span>
                <p className="mt-1 text-muted-foreground">
                  {distributor.notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Equipment Catalog */}
      <div>
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Equipment Catalog ({distributor.equipment.length})
          </h2>

          {/* Category Filter */}
          {distributor.equipment.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="category-filter" className="text-sm whitespace-nowrap">
                Filter by:
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger id="category-filter" className="w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getAllCategories().map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <EquipmentCardSkeleton key={i} />
            ))}
          </div>
        ) : distributor.equipment.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No equipment found"
            description="Try scraping the website to import products from this distributor."
            action={
              distributor.website && (
                <Button onClick={handleRescrape} disabled={scraping}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${scraping ? "animate-spin" : ""}`} />
                  {scraping ? "Scraping..." : "Scrape Website"}
                </Button>
              )
            }
          />
        ) : filteredEquipment.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No equipment in this category"
            description="Try selecting a different category or view all equipment."
            action={
              <Button onClick={() => setSelectedCategory("all")} variant="outline">
                View All Categories
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEquipment.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  className="group p-0 bg-white border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50 cursor-pointer"
                >
                {/* Product Image */}
                <div className="relative w-full h-48 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.error("Image failed to load:", {
                          url: item.imageUrl,
                          name: item.name,
                          error: e,
                        });
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML =
                            '<div class="flex flex-col items-center justify-center h-full text-slate-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg><p class="text-xs mt-2">Image unavailable</p></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <Package className="h-16 w-16" />
                    </div>
                  )}

                  {/* Stock Badge Overlay */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={item.inStock ? "default" : "destructive"}
                      className={
                        item.inStock
                          ? "bg-emerald-500 text-white border-0 shadow-md"
                          : "bg-red-500 text-white border-0 shadow-md"
                      }
                    >
                      {item.inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>

                  {/* Action Buttons Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEquipment(item.id);
                      }}
                      className="h-8 w-8 p-0 bg-white border border-red-300 shadow-md"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>

                  {/* Category Badge */}
                  <div className="absolute bottom-2 left-2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-white border border-gray-200"
                    >
                      {getCategoryDisplayName(item.category)}
                    </Badge>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4 space-y-3">
                  {/* Title and Manufacturer */}
                  <div>
                    <h3 className="font-semibold text-base leading-tight text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>
                    {item.manufacturer && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        {item.manufacturer}
                      </p>
                    )}
                  </div>

                  {/* Model Number */}
                  <div className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block">
                    Model: {item.modelNumber}
                  </div>

                  {/* Description (if available) */}
                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Rating (if available) */}
                  {item.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(item.rating!)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      {item.reviewCount && (
                        <span className="text-xs text-slate-500">
                          ({item.reviewCount})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-2xl font-bold text-blue-600">
                      ${item.unitPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Product URL Link */}
                  {item.sourceUrl && (
                    <div className="mt-3">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Product Page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add URL Dialog */}
      <Dialog open={showAddUrlDialog} onOpenChange={setShowAddUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New URL to Scrape</DialogTitle>
            <DialogDescription>
              Enter a product page or category URL from {distributor?.name} to
              scrape additional products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newUrl">URL</Label>
              <Input
                id="newUrl"
                placeholder="https://example.com/products/solar-panels"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddUrl();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddUrlDialog(false);
                setNewUrl("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddUrl} disabled={!newUrl.trim()}>
              Scrape URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
