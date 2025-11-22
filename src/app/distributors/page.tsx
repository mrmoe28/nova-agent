"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DistributorCardSkeleton, EquipmentCardSkeleton } from "@/components/skeleton-loaders";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Package,
  Search,
  ExternalLink,
  Globe,
  Loader2,
  Star,
  Upload,
  Zap,
} from "lucide-react";
import DistributorDiscovery from "@/components/DistributorDiscovery";
import { EquipmentSearchPrompt } from "@/components/EquipmentSearchPrompt";

interface Distributor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  equipment?: { id: string; category: string; imageUrl: string | null; name: string }[];
  _count?: {
    equipment: number;
  };
}

interface Equipment {
  id: string;
  distributorId: string;
  category: string;
  name: string;
  manufacturer?: string;
  modelNumber: string;
  description?: string;
  unitPrice: number;
  imageUrl?: string;
  dataSheetUrl?: string;
  inStock: boolean;
  leadTimeDays?: number;
  rating?: number;
  reviewCount?: number;
  distributor?: { id: string; name: string };
}

export default function DistributorsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"distributors" | "equipment" | "discovery">(
    "distributors",
  );
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDistributor, setShowAddDistributor] = useState(false);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [editingDistributor, setEditingDistributor] =
    useState<Distributor | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null,
  );

  // Fetch distributors
  const fetchDistributors = async () => {
    try {
      const response = await fetch("/api/distributors");
      const data = await response.json();
      if (data.success) {
        setDistributors(data.distributors);
      }
    } catch (error) {
      console.error("Error fetching distributors:", error);
    }
  };

  // Fetch equipment
  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment");
      const data = await response.json();
      if (data.success) {
        setEquipment(data.equipment);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDistributors(), fetchEquipment()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleDeleteDistributor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this distributor?")) return;

    try {
      const response = await fetch(`/api/distributors/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchDistributors();
      }
    } catch (error) {
      console.error("Error deleting distributor:", error);
      alert("Failed to delete distributor");
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      const response = await fetch(`/api/equipment/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchEquipment();
      }
    } catch (error) {
      console.error("Error deleting equipment:", error);
      alert("Failed to delete equipment");
    }
  };

  const filteredDistributors = distributors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contactName?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredEquipment = equipment.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-screen -ml-[50vw] left-1/2 relative min-h-screen bg-background">
      <div className="w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Distributors & Equipment
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your distributor network and equipment catalog
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("distributors")}
            className={`pb-4 text-sm font-semibold border-b-2 ${
              activeTab === "distributors"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600"
            }`}
          >
            <Building2 className="inline-block mr-2 h-4 w-4" />
            Distributors ({distributors.length})
          </button>
          <button
            onClick={() => setActiveTab("equipment")}
            className={`pb-4 text-sm font-semibold border-b-2 ${
              activeTab === "equipment"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600"
            }`}
          >
            <Package className="inline-block mr-2 h-4 w-4" />
            Equipment ({equipment.length})
          </button>
          <button
            onClick={() => setActiveTab("discovery")}
            className={`pb-4 text-sm font-semibold border-b-2 ${
              activeTab === "discovery"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600"
            }`}
          >
            <Zap className="inline-block mr-2 h-4 w-4" />
            Discover New
          </button>
        </div>
      </div>

      {/* Search and Add - Hide for discovery tab */}
      {activeTab !== "discovery" && (
        <div className="mb-8 flex gap-3 items-start">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200"
            />
          </div>
          <div className="flex gap-3">
            {/* Online Search Prompt - Top Right */}
            <EquipmentSearchPrompt
              onDistributorAdded={() => {
                fetchDistributors();
                fetchEquipment();
              }}
            />
            <Button
              onClick={() => {
                if (activeTab === "distributors") {
                  setEditingDistributor(null);
                  setShowAddDistributor(true);
                } else {
                  setEditingEquipment(null);
                  setShowAddEquipment(true);
                }
              }}
              className="bg-blue-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {activeTab === "distributors" ? "Distributor" : "Equipment"}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === "discovery" ? (
        <DistributorDiscovery
          onSuccess={() => {
            fetchDistributors();
            setActiveTab("distributors");
          }}
        />
      ) : activeTab === "distributors" ? (
        <>
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <DistributorCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredDistributors.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No distributors found"
              description={
                searchQuery
                  ? `No distributors match "${searchQuery}". Try a different search term.`
                  : "Get started by adding your first distributor or discovering new ones."
              }
              action={
                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab("discovery")}
                    variant="outline"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Discover Distributors
                  </Button>
                  <Button onClick={() => setShowAddDistributor(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manually
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDistributors.map((distributor, index) => {
            const thumbnailEquipment = distributor.equipment?.find(
              (eq) => eq.imageUrl
            );
            
                return (
                  <motion.div
                    key={distributor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className="overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                      onClick={() => router.push(`/distributors/${distributor.id}`)}
                    >
                {/* Thumbnail Image */}
                <div className="relative w-full h-48 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                  {thumbnailEquipment?.imageUrl ? (
                    <Image
                      src={thumbnailEquipment.imageUrl}
                      alt={thumbnailEquipment.name || distributor.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <Package className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                  {/* Overlay gradient for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-slate-900 truncate">
                        {distributor.name}
                      </h3>
                      {distributor.contactName && (
                        <p className="text-sm text-slate-600 mt-1 truncate">
                          {distributor.contactName}
                        </p>
                      )}
                    </div>
                    <div
                      className="flex gap-2 ml-2 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDistributor(distributor);
                          setShowAddDistributor(true);
                        }}
                        className="h-8 w-8 p-0 border-slate-300"
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-700" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDistributor(distributor.id)}
                        className="h-8 w-8 p-0 border-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {distributor.email && (
                      <p className="text-slate-600 truncate">{distributor.email}</p>
                    )}
                    {distributor.phone && (
                      <p className="text-slate-600">{distributor.phone}</p>
                    )}
                    {distributor.website && (
                      <a
                        href={distributor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 flex items-center gap-1 hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {distributor._count?.equipment && distributor._count.equipment > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700"
                      >
                        {distributor._count.equipment} equipment item
                        {distributor._count.equipment !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  )}
                </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <EquipmentCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No equipment found"
              description={
                searchQuery
                  ? `No equipment matches "${searchQuery}". Try a different search term.`
                  : "No equipment available. Add equipment to distributors or scrape their websites."
              }
              action={
                <Button onClick={() => setShowAddEquipment(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment
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
                    className="group p-0 bg-white border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50"
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
                          '<div class="flex items-center justify-center h-full text-slate-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg><p class="text-xs mt-2">Image unavailable</p></div>';
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <Package className="h-16 w-16" />
                  </div>
                )}

                {/* Action Buttons Overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEquipment(item);
                      setShowAddEquipment(true);
                    }}
                    className="h-8 w-8 p-0 bg-white border border-slate-300 shadow-md"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-700" />
                  </Button>
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

                {/* Category Badge */}
                <div className="absolute bottom-2 left-2">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-white border border-gray-200"
                  >
                    {item.category}
                  </Badge>
                </div>
              </div>

              {/* Product Details */}
              <div className="p-4 space-y-3">
                {/* Title and Manufacturer */}
                <div>
                  <h3 className="font-semibold text-base leading-tight text-slate-900 line-clamp-2">
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

                {/* Distributor */}
                {item.distributor && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {item.distributor.name}
                    </p>
                  </div>
                )}
                </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Distributor Modal */}
      {showAddDistributor && (
        <DistributorForm
          distributor={editingDistributor}
          onClose={() => {
            setShowAddDistributor(false);
            setEditingDistributor(null);
          }}
          onSuccess={() => {
            setShowAddDistributor(false);
            setEditingDistributor(null);
            fetchDistributors();
          }}
          onEquipmentUpdated={() => {
            fetchEquipment();
            // Switch to Equipment tab so user can see new products
            setActiveTab("equipment");
          }}
        />
      )}

      {/* Add/Edit Equipment Modal */}
      {showAddEquipment && (
        <EquipmentForm
          equipment={editingEquipment}
          distributors={distributors}
          onClose={() => {
            setShowAddEquipment(false);
            setEditingEquipment(null);
          }}
          onSuccess={() => {
            setShowAddEquipment(false);
            setEditingEquipment(null);
            fetchEquipment();
          }}
        />
      )}
      </div>
    </div>
  );
}

// Distributor Form Component
function DistributorForm({
  distributor,
  onClose,
  onSuccess,
  onEquipmentUpdated,
}: {
  distributor: Distributor | null;
  onClose: () => void;
  onSuccess: () => void;
  onEquipmentUpdated?: () => void;
}) {
  const [formData, setFormData] = useState({
    name: distributor?.name || "",
    contactName: distributor?.contactName || "",
    email: distributor?.email || "",
    phone: distributor?.phone || "",
    website: distributor?.website || "",
    address: distributor?.address || "",
    notes: distributor?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeProducts, setScrapeProducts] = useState(true);
  const [scrapeResults, setScrapeResults] = useState<{
    company?: {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
      description?: string;
    };
    productsFound?: number;
    productLinks?: string[];
  } | null>(null);

  const handleScrapeUrl = async () => {
    if (!scrapeUrl || !scrapeUrl.startsWith("http")) {
      alert("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setScraping(true);
    setScrapeResults(null);

    try {
      const response = await fetch("/api/distributors/scrape-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: scrapeUrl,
          saveToDatabase: scrapeProducts, // Save products if enabled
          scrapeProducts: scrapeProducts, // Scrape products if enabled
          useBrowser: false, // Browser mode disabled - requires valid Browserless token
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Auto-fill form with scraped company data if available
        if (data.company) {
          setFormData({
            name: data.company.name || formData.name,
            contactName: data.company.contactName || formData.contactName,
            email: data.company.email || formData.email,
            phone: data.company.phone || formData.phone,
            website: data.company.website || scrapeUrl,
            address: data.company.address || formData.address,
            notes: data.company.description || formData.notes,
          });
        }

        setScrapeResults({
          company: data.company,
          productsFound: data.products?.length || 0,
          productLinks: data.productLinks || [],
        });

        const productsCount =
          data.products?.length || data.productLinks?.length || 0;

        // Refresh equipment list if products were saved
        // Add delay to ensure database transaction commits before fetching
        if (scrapeProducts && productsCount > 0 && onEquipmentUpdated) {
          alert(
            `Successfully scraped!\n` +
              `Found ${productsCount} product${productsCount !== 1 ? "s" : ""} and saved to database.\n\n` +
              `The page will refresh in a moment to show the new distributor and products...`,
          );

          setTimeout(() => {
            // Refresh both distributors and equipment lists
            onSuccess(); // This refreshes the distributors list
            onEquipmentUpdated(); // This refreshes equipment and switches to Equipment tab
            // Modal will be closed by onSuccess callback
          }, 1000); // Wait 1 second for DB transaction to complete
        } else {
          alert(
            `Successfully scraped!\n` +
              `Found ${productsCount} product${productsCount !== 1 ? "s" : ""}.`,
          );
        }
      } else {
        alert(`Failed to scrape: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error scraping URL:", error);
      alert("Failed to scrape URL. Please check the URL and try again.");
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = distributor
        ? `/api/distributors/${distributor.id}`
        : "/api/distributors";
      const method = distributor ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert("Failed to save distributor");
      }
    } catch (error) {
      console.error("Error saving distributor:", error);
      alert("Failed to save distributor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {distributor ? "Edit" : "Add"} Distributor
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Auto-Scrape from URL Section */}
          {!distributor && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <Globe className="h-4 w-4" />
                <span>Auto-Fill from Website</span>
              </div>
              <p className="text-xs text-blue-700">
                Paste a distributor&apos;s website URL to automatically extract
                company info and find products
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  disabled={scraping}
                  className="flex-1 bg-white"
                />
                <Button
                  type="button"
                  onClick={handleScrapeUrl}
                  disabled={scraping || !scrapeUrl}
                  className="bg-blue-600 text-white"
                >
                  {scraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    "Scrape"
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="scrapeProducts"
                  checked={scrapeProducts}
                  onChange={(e) => setScrapeProducts(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="scrapeProducts"
                  className="text-sm text-blue-900"
                >
                  Scrape and save products to database (takes longer)
                </label>
              </div>
              {scrapeResults &&
                scrapeResults.productsFound !== undefined &&
                scrapeResults.productsFound > 0 && (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    ✓ Found {scrapeResults.productsFound} product
                    {scrapeResults.productsFound !== 1 ? "s" : ""}!{" "}
                    {scrapeProducts
                      ? "Saved to database."
                      : "Form auto-filled with company info."}
                  </div>
                )}
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="contactName" className="text-slate-700 font-medium">
              Contact Name
            </Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) =>
                setFormData({ ...formData, contactName: e.target.value })
              }
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-slate-700 font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="website" className="text-slate-700 font-medium">
              Website
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="address" className="text-slate-700 font-medium">
              Address
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="notes" className="text-slate-700 font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Equipment Form Component
function EquipmentForm({
  equipment,
  distributors,
  onClose,
  onSuccess,
}: {
  equipment: Equipment | null;
  distributors: Distributor[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    distributorId: equipment?.distributorId || "",
    category: equipment?.category || "solar",
    name: equipment?.name || "",
    manufacturer: equipment?.manufacturer || "",
    modelNumber: equipment?.modelNumber || "",
    description: equipment?.description || "",
    unitPrice: equipment?.unitPrice?.toString() || "",
    imageUrl: equipment?.imageUrl || "",
    dataSheetUrl: equipment?.dataSheetUrl || "",
    inStock: equipment?.inStock !== false,
    leadTimeDays: equipment?.leadTimeDays?.toString() || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    equipment?.imageUrl || null,
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!imageFile) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("image", imageFile);

      const response = await fetch("/api/equipment/upload-image", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setFormData({ ...formData, imageUrl: data.imageUrl });
        alert("Image uploaded successfully!");
        setImageFile(null);
      } else {
        alert("Failed to upload image: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = equipment
        ? `/api/equipment/${equipment.id}`
        : "/api/equipment";
      const method = equipment ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert("Failed to save equipment");
      }
    } catch (error) {
      console.error("Error saving equipment:", error);
      alert("Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {equipment ? "Edit" : "Add"} Equipment
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="distributorId"
                className="text-slate-700 font-medium"
              >
                Distributor *
              </Label>
              <Select
                value={formData.distributorId}
                onValueChange={(value) =>
                  setFormData({ ...formData, distributorId: value })
                }
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select distributor" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-slate-700 font-medium">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solar">Solar Panels</SelectItem>
                  <SelectItem value="battery">Battery</SelectItem>
                  <SelectItem value="inverter">Inverter</SelectItem>
                  <SelectItem value="mounting">Mounting</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">
              Equipment Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="manufacturer"
                className="text-slate-700 font-medium"
              >
                Manufacturer
              </Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) =>
                  setFormData({ ...formData, manufacturer: e.target.value })
                }
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label
                htmlFor="modelNumber"
                className="text-slate-700 font-medium"
              >
                Model Number *
              </Label>
              <Input
                id="modelNumber"
                value={formData.modelNumber}
                onChange={(e) =>
                  setFormData({ ...formData, modelNumber: e.target.value })
                }
                required
                className="mt-1 bg-white border-slate-300"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-700 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unitPrice" className="text-slate-700 font-medium">
                Unit Price (USD) *
              </Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                required
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label
                htmlFor="leadTimeDays"
                className="text-slate-700 font-medium"
              >
                Lead Time (Days)
              </Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) =>
                  setFormData({ ...formData, leadTimeDays: e.target.value })
                }
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="inStock" className="text-slate-700 font-medium">
                Availability
              </Label>
              <Select
                value={formData.inStock.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, inStock: value === "true" })
                }
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">In Stock</SelectItem>
                  <SelectItem value="false">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Product Image</Label>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full h-48 border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <Image
                  src={imagePreview}
                  alt="Product preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}

            {/* Image Upload Section */}
            <div className="flex gap-2">
              <input
                type="file"
                id="imageFile"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Select equipment image file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("imageFile")?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Image
              </Button>

              {imageFile && (
                <Button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploadingImage}
                  className="bg-blue-600 text-white"
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              )}
            </div>

            {imageFile && (
              <p className="text-xs text-slate-600">
                Selected: {imageFile.name} (
                {(imageFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}

            {/* Manual URL Input (Alternative) */}
            <div className="pt-2 border-t border-slate-200">
              <Label htmlFor="imageUrl" className="text-xs text-slate-600">
                Or enter image URL manually
              </Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImagePreview(e.target.value);
                }}
                placeholder="https://"
                className="mt-1 bg-white border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="dataSheetUrl"
              className="text-slate-700 font-medium"
            >
              Data Sheet URL
            </Label>
            <Input
              id="dataSheetUrl"
              type="url"
              value={formData.dataSheetUrl}
              onChange={(e) =>
                setFormData({ ...formData, dataSheetUrl: e.target.value })
              }
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
