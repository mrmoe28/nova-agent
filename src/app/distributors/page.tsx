"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Distributors & Equipment</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your distributor network and equipment catalog
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("distributors")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "distributors"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="inline-block mr-2 h-4 w-4" />
            Distributors ({distributors.length})
          </button>
          <button
            onClick={() => setActiveTab("equipment")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "equipment"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="inline-block mr-2 h-4 w-4" />
            Equipment ({equipment.length})
          </button>
        </div>
      </div>

      {/* Search and Add */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {activeTab === "distributors" ? "Distributor" : "Equipment"}
        </Button>
      </div>

      {/* Content */}
      {activeTab === "distributors" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDistributors.map((distributor) => (
            <Card key={distributor.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{distributor.name}</h3>
                  {distributor.contactName && (
                    <p className="text-sm text-muted-foreground">{distributor.contactName}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingDistributor(distributor)
                      setShowAddDistributor(true)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDistributor(distributor.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                {distributor.email && <p className="text-muted-foreground">{distributor.email}</p>}
                {distributor.phone && <p className="text-muted-foreground">{distributor.phone}</p>}
                {distributor.website && (
                  <a
                    href={distributor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {distributor.equipment && distributor.equipment.length > 0 && (
                <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                  {distributor.equipment.length} equipment item(s)
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="p-4">
              {item.imageUrl && (
                <div className="relative w-full h-32 mb-3">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.manufacturer}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingEquipment(item)
                      setShowAddEquipment(true)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEquipment(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm mb-2">Model: {item.modelNumber}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-lg font-bold text-primary">
                  ${item.unitPrice.toLocaleString()}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${item.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {item.inStock ? "In Stock" : "Out of Stock"}
                </span>
              </div>
              {item.distributor && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.distributor.name}
                </p>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">
          {distributor ? "Edit" : "Add"} Distributor
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://"
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">
          {equipment ? "Edit" : "Add"} Equipment
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="distributorId">Distributor *</Label>
              <Select
                value={formData.distributorId}
                onValueChange={(value) => setFormData({ ...formData, distributorId: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
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
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="modelNumber">Model Number *</Label>
              <Input
                id="modelNumber"
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="unitPrice">Unit Price (USD) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="inStock">Availability</Label>
              <Select
                value={formData.inStock.toString()}
                onValueChange={(value) => setFormData({ ...formData, inStock: value === "true" })}
              >
                <SelectTrigger>
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
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://"
            />
          </div>

          <div>
            <Label htmlFor="dataSheetUrl">Data Sheet URL</Label>
            <Input
              id="dataSheetUrl"
              type="url"
              value={formData.dataSheetUrl}
              onChange={(e) => setFormData({ ...formData, dataSheetUrl: e.target.value })}
              placeholder="https://"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
