"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Trash2, Package, Star } from "lucide-react";
import type { EquipmentWithDistributor } from "@/lib/types/distributor";
import { useDeleteEquipment } from "@/lib/hooks/use-equipment";

interface EquipmentCardProps {
  equipment: EquipmentWithDistributor;
  index: number;
  onEdit: (equipment: EquipmentWithDistributor) => void;
}

export function EquipmentCard({ equipment, index, onEdit }: EquipmentCardProps) {
  const deleteEquipment = useDeleteEquipment();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this equipment?")) {
      deleteEquipment.mutate(equipment.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group p-0 bg-white border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50">
        {/* Product Image */}
        <div className="relative w-full h-48 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          {equipment.imageUrl ? (
            <Image
              src={equipment.imageUrl}
              alt={equipment.name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
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

          {/* Action Buttons Overlay */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(equipment);
              }}
              className="h-8 w-8 p-0 bg-white border border-slate-300 shadow-md"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-700" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={deleteEquipment.isPending}
              className="h-8 w-8 p-0 bg-white border border-red-300 shadow-md"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>

          {/* Stock Badge Overlay */}
          <div className="absolute top-2 left-2">
            <Badge
              variant={equipment.inStock ? "default" : "destructive"}
              className={
                equipment.inStock
                  ? "bg-emerald-500 text-white border-0 shadow-md"
                  : "bg-red-500 text-white border-0 shadow-md"
              }
            >
              {equipment.inStock ? "In Stock" : "Out of Stock"}
            </Badge>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs bg-white border border-gray-200">
              {equipment.category}
            </Badge>
          </div>
        </div>

        {/* Product Details */}
        <div className="p-4 space-y-3">
          {/* Title and Manufacturer */}
          <div>
            <h3 className="font-semibold text-base leading-tight text-slate-900 line-clamp-2">
              {equipment.name}
            </h3>
            {equipment.manufacturer && (
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {equipment.manufacturer}
              </p>
            )}
          </div>

          {/* Model Number */}
          <div className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block">
            Model: {equipment.modelNumber}
          </div>

          {/* Description */}
          {equipment.description && (
            <p className="text-xs text-slate-600 line-clamp-2">
              {equipment.description}
            </p>
          )}

          {/* Rating */}
          {equipment.rating && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.floor(equipment.rating!)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
              {equipment.reviewCount && (
                <span className="text-xs text-slate-500">
                  ({equipment.reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-2xl font-bold text-blue-600">
              ${equipment.unitPrice.toLocaleString()}
            </span>
          </div>

          {/* Distributor */}
          {equipment.distributor && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {equipment.distributor.name}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
