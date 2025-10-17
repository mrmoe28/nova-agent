"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

interface Distributor {
  id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  notes?: string
  logoUrl?: string
  rating?: number
  shippingInfo?: string
  paymentTerms?: string
  lastScrapedAt?: string
  createdAt: string
  equipment: Equipment[]
}

interface Equipment {
  id: string
  category: string
  name: string
  manufacturer?: string
  modelNumber: string
  description?: string
  unitPrice: number
  imageUrl?: string
  sourceUrl?: string
  inStock: boolean
  rating?: number
  reviewCount?: number
}

export default function DistributorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const distributorId = params.id as string

  const [distributor, setDistributor] = useState<Distributor | null>(null)
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [useBrowser, setUseBrowser] = useState(true) // Default to true for image extraction

  const fetchDistributor = useCallback(async () => {
    try {
      const response = await fetch(`/api/distributors/${distributorId}`)
      const data = await response.json()

      if (data.success) {
        setDistributor(data.distributor)
      }
    } catch (error) {
      console.error("Error fetching distributor:", error)
    } finally {
      setLoading(false)
    }
  }, [distributorId])

  useEffect(() => {
    fetchDistributor()
  }, [fetchDistributor])

  const handleRescrape = async () => {
    if (!distributor?.website) {
      alert("No website URL found for this distributor")
      return
    }

    setScraping(true)
    try {
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
      })

      const data = await response.json()

      if (data.success) {
        alert(`Successfully rescraped! Found ${data.productsFound} products. Refreshing...`)
        // Add delay to ensure database transaction commits before fetching
        setTimeout(() => {
          fetchDistributor()
        }, 1000) // Wait 1 second for DB transaction to complete
      } else {
        alert(`Rescrape failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Error rescraping:", error)
      alert("Failed to rescrape distributor")
    } finally {
      setScraping(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Distributor not found</p>
        <Button onClick={() => router.push("/distributors")} className="mt-4">
          Back to Distributors
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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
                  Last scraped: {new Date(distributor.lastScrapedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {distributor.website && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useBrowser}
                  onChange={(e) => setUseBrowser(e.target.checked)}
                  className="w-4 h-4"
                  disabled={scraping}
                />
                <span className="text-muted-foreground">
                  Browser Mode (extracts product images, slower but more accurate)
                </span>
              </label>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push(`/distributors`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              {distributor.website && (
                <Button
                  variant="outline"
                  onClick={handleRescrape}
                  disabled={scraping}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${scraping ? "animate-spin" : ""}`} />
                  {scraping ? "Scraping..." : "Rescrape"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
          <div className="space-y-3">
            {distributor.contactName && (
              <div className="text-sm">
                <span className="font-medium">Contact:</span> {distributor.contactName}
              </div>
            )}
            {distributor.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${distributor.email}`} className="text-blue-600">
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
                <span className="font-medium">Shipping:</span> {distributor.shippingInfo}
              </div>
            )}
            {distributor.paymentTerms && (
              <div className="text-sm">
                <span className="font-medium">Payment Terms:</span> {distributor.paymentTerms}
              </div>
            )}
            {distributor.notes && (
              <div className="text-sm">
                <span className="font-medium">Notes:</span>
                <p className="mt-1 text-muted-foreground">{distributor.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Equipment Catalog */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Equipment Catalog ({distributor.equipment.length})
          </h2>
        </div>

        {distributor.equipment.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No equipment found. Try scraping the website to import products.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {distributor.equipment.map((item) => (
              <Card
                key={item.id}
                className="group p-0 bg-white border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-300 cursor-pointer"
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
                        const target = e.target as HTMLImageElement
                        console.error('Image failed to load:', {
                          url: item.imageUrl,
                          name: item.name,
                          error: e
                        })
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-slate-400"><svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg><p class="text-xs mt-2">Image unavailable</p></div>'
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <Package className="h-16 w-16" />
                    </div>
                  )}

                  {/* Stock Badge Overlay */}
                  <div className="absolute top-2 right-2">
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
                    <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur-sm">
                      {item.category}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
