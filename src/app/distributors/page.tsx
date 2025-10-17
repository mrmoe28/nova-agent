"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  equipment?: { id: string; category: string }[]
}

interface Equipment {
  id: string
  distributorId: string
  category: string
  name: string
  manufacturer?: string
  modelNumber: string
  description?: string
  unitPrice: number
  imageUrl?: string
  dataSheetUrl?: string
  inStock: boolean
  leadTimeDays?: number
  distributor?: { id: string; name: string }
}

export default function DistributorsPage() {
  const [activeTab, setActiveTab] = useState<"distributors" | "equipment">("distributors")
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDistributor, setShowAddDistributor] = useState(false)
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  // Fetch distributors
  const fetchDistributors = async () => {
    try {
      const response = await fetch("/api/distributors")
      const data = await response.json()
      if (data.success) {
        setDistributors(data.distributors)
      }
    } catch (error) {
      console.error("Error fetching distributors:", error)
    }
  }

  // Fetch equipment
  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/equipment")
      const data = await response.json()
      if (data.success) {
        setEquipment(data.equipment)
      }
    } catch (error) {
      console.error("Error fetching equipment:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchDistributors(), fetchEquipment()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleDeleteDistributor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this distributor?")) return

    try {
      const response = await fetch(`/api/distributors/${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchDistributors()
      }
    } catch (error) {
      console.error("Error deleting distributor:", error)
      alert("Failed to delete distributor")
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return

    try {
      const response = await fetch(`/api/equipment/${id}`, { method: "DELETE" })
      if (response.ok) {
        await fetchEquipment()
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      alert("Failed to delete equipment")
    }
  }

  const filteredDistributors = distributors.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.contactName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEquipment = equipment.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Distributors & Equipment</h1>
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
        </div>
      </div>

      {/* Search and Add */}
      <div className="mb-8 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Button
          onClick={() => {
            if (activeTab === "distributors") {
              setEditingDistributor(null)
              setShowAddDistributor(true)
            } else {
              setEditingEquipment(null)
              setShowAddEquipment(true)
            }
          }}
          className="bg-blue-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab === "distributors" ? "Distributor" : "Equipment"}
        </Button>
      </div>

      {/* Content */}
      {activeTab === "distributors" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDistributors.map((distributor) => (
            <Card key={distributor.id} className="p-6 bg-white border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">{distributor.name}</h3>
                  {distributor.contactName && (
                    <p className="text-sm text-slate-600 mt-1">{distributor.contactName}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingDistributor(distributor)
                      setShowAddDistributor(true)
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
                {distributor.email && <p className="text-slate-600">{distributor.email}</p>}
                {distributor.phone && <p className="text-slate-600">{distributor.phone}</p>}
                {distributor.website && (
                  <a
                    href={distributor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 flex items-center gap-1"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {distributor.equipment && distributor.equipment.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {distributor.equipment.length} equipment item{distributor.equipment.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="p-5 bg-white border border-slate-200 shadow-sm">
              {item.imageUrl && (
                <div className="relative w-full h-40 mb-4 bg-slate-50 rounded-lg overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight">{item.name}</h3>
                  {item.manufacturer && (
                    <p className="text-xs text-slate-500 mt-1">{item.manufacturer}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingEquipment(item)
                      setShowAddEquipment(true)
                    }}
                    className="h-8 w-8 p-0 border-slate-300"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-700" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteEquipment(item.id)}
                    className="h-8 w-8 p-0 border-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-3">Model: {item.modelNumber}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-blue-600">
                  ${item.unitPrice.toLocaleString()}
                </span>
                <Badge
                  variant={item.inStock ? "default" : "destructive"}
                  className={item.inStock ? "bg-emerald-100 text-emerald-800 border-0" : "bg-red-100 text-red-800 border-0"}
                >
                  {item.inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              {item.distributor && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    {item.distributor.name}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Distributor Modal */}
      {showAddDistributor && (
        <DistributorForm
          distributor={editingDistributor}
          onClose={() => {
            setShowAddDistributor(false)
            setEditingDistributor(null)
          }}
          onSuccess={() => {
            setShowAddDistributor(false)
            setEditingDistributor(null)
            fetchDistributors()
          }}
        />
      )}

      {/* Add/Edit Equipment Modal */}
      {showAddEquipment && (
        <EquipmentForm
          equipment={editingEquipment}
          distributors={distributors}
          onClose={() => {
            setShowAddEquipment(false)
            setEditingEquipment(null)
          }}
          onSuccess={() => {
            setShowAddEquipment(false)
            setEditingEquipment(null)
            fetchEquipment()
          }}
        />
      )}
    </div>
  )
}

// Distributor Form Component
function DistributorForm({
  distributor,
  onClose,
  onSuccess,
}: {
  distributor: Distributor | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: distributor?.name || "",
    contactName: distributor?.contactName || "",
    email: distributor?.email || "",
    phone: distributor?.phone || "",
    website: distributor?.website || "",
    address: distributor?.address || "",
    notes: distributor?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scrapeResults, setScrapeResults] = useState<{
    company?: {
      name?: string
      contactName?: string
      email?: string
      phone?: string
      website?: string
      address?: string
      description?: string
    }
    productsFound?: number
    productLinks?: string[]
  } | null>(null)

  const handleScrapeUrl = async () => {
    if (!scrapeUrl || !scrapeUrl.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://')
      return
    }

    setScraping(true)
    setScrapeResults(null)

    try {
      const response = await fetch('/api/distributors/scrape-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: scrapeUrl,
          saveToDatabase: false, // Just preview first
          scrapeProducts: false, // Only get company info for now
        }),
      })

      const data = await response.json()

      if (data.success && data.company) {
        // Auto-fill form with scraped data
        setFormData({
          name: data.company.name || formData.name,
          contactName: data.company.contactName || formData.contactName,
          email: data.company.email || formData.email,
          phone: data.company.phone || formData.phone,
          website: data.company.website || scrapeUrl,
          address: data.company.address || formData.address,
          notes: data.company.description || formData.notes,
        })

        setScrapeResults({
          company: data.company,
          productsFound: data.productsFound || 0,
          productLinks: data.productLinks || [],
        })

        alert(`Successfully scraped! Found ${data.productLinks?.length || 0} product links.`)
      } else {
        alert(`Failed to scrape: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error scraping URL:', error)
      alert('Failed to scrape URL. Please check the URL and try again.')
    } finally {
      setScraping(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = distributor
        ? `/api/distributors/${distributor.id}`
        : "/api/distributors"
      const method = distributor ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        alert("Failed to save distributor")
      }
    } catch (error) {
      console.error("Error saving distributor:", error)
      alert("Failed to save distributor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
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
                Paste a distributor&apos;s website URL to automatically extract company info and find products
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
                    'Scrape'
                  )}
                </Button>
              </div>
              {scrapeResults && scrapeResults.productLinks && scrapeResults.productLinks.length > 0 && (
                <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  ✓ Found {scrapeResults.productLinks.length} product links! Form auto-filled with company info.
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-slate-700 font-medium">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="contactName" className="text-slate-700 font-medium">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-slate-700 font-medium">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="website" className="text-slate-700 font-medium">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="address" className="text-slate-700 font-medium">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div>
            <Label htmlFor="notes" className="text-slate-700 font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="mt-1 bg-white border-slate-300"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Equipment Form Component
function EquipmentForm({
  equipment,
  distributors,
  onClose,
  onSuccess,
}: {
  equipment: Equipment | null
  distributors: Distributor[]
  onClose: () => void
  onSuccess: () => void
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
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = equipment ? `/api/equipment/${equipment.id}` : "/api/equipment"
      const method = equipment ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        alert("Failed to save equipment")
      }
    } catch (error) {
      console.error("Error saving equipment:", error)
      alert("Failed to save equipment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-slate-900">
          {equipment ? "Edit" : "Add"} Equipment
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distributorId" className="text-slate-700 font-medium">Distributor *</Label>
              <Select
                value={formData.distributorId}
                onValueChange={(value) => setFormData({ ...formData, distributorId: value })}
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
              <Label htmlFor="category" className="text-slate-700 font-medium">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue />
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
            <Label htmlFor="name" className="text-slate-700 font-medium">Equipment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer" className="text-slate-700 font-medium">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="modelNumber" className="text-slate-700 font-medium">Model Number *</Label>
              <Input
                id="modelNumber"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                required
                className="mt-1 bg-white border-slate-300"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-700 font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unitPrice" className="text-slate-700 font-medium">Unit Price (USD) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="leadTimeDays" className="text-slate-700 font-medium">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                className="mt-1 bg-white border-slate-300"
              />
            </div>
            <div>
              <Label htmlFor="inStock" className="text-slate-700 font-medium">Availability</Label>
              <Select
                value={formData.inStock.toString()}
                onValueChange={(value) => setFormData({ ...formData, inStock: value === "true" })}
              >
                <SelectTrigger className="mt-1 bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">In Stock</SelectItem>
                  <SelectItem value="false">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl" className="text-slate-700 font-medium">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div>
            <Label htmlFor="dataSheetUrl" className="text-slate-700 font-medium">Data Sheet URL</Label>
            <Input
              id="dataSheetUrl"
              type="url"
              value={formData.dataSheetUrl}
              onChange={(e) => setFormData({ ...formData, dataSheetUrl: e.target.value })}
              placeholder="https://"
              className="mt-1 bg-white border-slate-300"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-300">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 text-white">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
