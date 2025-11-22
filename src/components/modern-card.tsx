"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  onClick?: () => void;
}

export function ModernCard({
  children,
  className,
  hover = true,
  delay = 0,
  onClick,
}: ModernCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={hover ? { scale: 1.02 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      <Card
        className={cn(
          "transition-all duration-300",
          hover && "hover:shadow-xl hover:border-primary/50",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        {children}
      </Card>
    </motion.div>
  );
}

