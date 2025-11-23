"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Trash2, ExternalLink, Package } from "lucide-react";
import type { DistributorWithEquipment } from "@/lib/types/distributor";
import { useDeleteDistributor } from "@/lib/hooks/use-distributors";

interface DistributorCardProps {
  distributor: DistributorWithEquipment;
  index: number;
  onEdit: (distributor: DistributorWithEquipment) => void;
}

export function DistributorCard({ distributor, index, onEdit }: DistributorCardProps) {
  const router = useRouter();
  const deleteDistributor = useDeleteDistributor();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this distributor?")) {
      deleteDistributor.mutate(distributor.id);
    }
  };

  const thumbnailEquipment = distributor.equipment?.find((eq) => eq.imageUrl);

  return (
    <motion.div
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
          {/* Overlay gradient */}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(distributor);
                }}
                className="h-8 w-8 p-0 border-slate-300"
              >
                <Pencil className="h-3.5 w-3.5 text-slate-700" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={deleteDistributor.isPending}
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
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {distributor._count.equipment} equipment item
                {distributor._count.equipment !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
