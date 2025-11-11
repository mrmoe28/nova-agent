# Equipment Selection UI - Setup Guide

## ✅ Completed

1. ✅ Created `EquipmentSelectionDialog` component with professional UI
2. ✅ Added RadioGroup ShadCN component
3. ✅ Fixed BOM pricing to use real distributor prices
4. ✅ Updated BOM page imports and state

## 🔧 Final Integration Steps

To complete the equipment selection UI, make these final edits to `src/app/wizard/[projectId]/bom/page.tsx`:

### Step 1: Update handleEditEquipment (line ~110)

Replace:
```typescript
const handleEditEquipment = (_item: BOMItem) => {
  toast.info("Equipment Selection", {
    description: "Equipment selection UI coming soon! For now, prices are pulled from your selected distributor automatically.",
  });
};
```

With:
```typescript
const handleEditEquipment = (item: BOMItem) => {
  setEditingItem(item);
  setDialogOpen(true);
};
```

### Step 2: Uncomment and fix handleEquipmentChange (line ~121-158)

Uncomment the `handleEquipmentChange` function and remove the `setEditingItemId(null)` line (line 145):

```typescript
const handleEquipmentChange = async (bomItemId: string, equipmentId: string) => {
  try {
    const response = await fetch(`/api/bom/${bomItemId}/update-equipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentId }),
    });

    const data = await response.json();

    if (data.success) {
      setBomItems(prev =>
        prev.map(item =>
          item.id === bomItemId ? data.bomItem : item
        )
      );

      const newTotal = bomItems
        .map(item => item.id === bomItemId ? data.bomItem : item)
        .reduce((sum, item) => sum + item.totalPriceUsd, 0);
      setTotalCost(newTotal);

      // REMOVE THIS LINE: setEditingItemId(null);
      toast.success("Equipment Updated", {
        description: "BOM item has been updated with selected equipment.",
      });
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error("Error updating equipment:", error);
    toast.error("Error", {
      description: "Failed to update equipment selection.",
    });
  }
};
```

### Step 3: Add Dialog Component (end of JSX, before `</div>`)

Add this before the closing tags at the end of the component:

```tsx
{/* Equipment Selection Dialog */}
<EquipmentSelectionDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  bomItem={editingItem}
  distributorId={distributorId}
  onEquipmentSelected={handleEquipmentChange}
/>

<Toaster />
```

## 🎨 Features

### Equipment Selection Dialog includes:
- ✅ **Search** - Filter equipment by name, manufacturer, model
- ✅ **Product Images** - Visual product selection
- ✅ **Pricing Comparison** - See unit prices for all options
- ✅ **Stock Status** - "In Stock" or "Out of Stock" badges
- ✅ **Ratings** - Star ratings and review counts
- ✅ **Specifications** - Product details and warranty info
- ✅ **Current Selection** - Shows what's currently selected
- ✅ **Professional UI** - Modern, clean ShadCN design

### BOM Page Updates:
- ✅ **Auto-select distributor** - Automatically uses first available distributor
- ✅ **Real pricing** - Pulls actual prices from distributor catalog
- ✅ **Product images** - Shows equipment images in BOM
- ✅ **Easy editing** - Click edit button to change equipment

## 🧪 Testing

After completing the integration:

1. Navigate to `/wizard/[projectId]/bom`
2. Click the Edit (pencil) button next to any BOM item
3. Equipment Selection Dialog should open
4. Search and filter equipment
5. Select new equipment
6. Click "Save Selection"
7. BOM should update with new pricing and product info

## 📝 Notes

- Equipment filtered by category automatically (solar, battery, inverter, etc.)
- Only shows in-stock items from selected distributor
- Prices update automatically when equipment is changed
- Total cost recalculates on equipment change

---

**Status:** Ready for final integration (3 simple edits)
**Created:** October 22, 2025
