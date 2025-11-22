"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================
// Animation Variants
// ============================================

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export const slideInFromLeft: Variants = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ============================================
// Transition Presets
// ============================================

export const smoothTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
};

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const bounceTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 10,
};

// ============================================
// Reusable Motion Components
// ============================================

interface MotionDivProps {
  children?: ReactNode;
  className?: string;
  variants?: Variants;
  transition?: Transition;
  delay?: number;
  whileHover?: any;
  whileTap?: any;
  onClick?: () => void;
}

export function MotionDiv({
  children,
  className,
  variants = fadeInUp,
  transition = smoothTransition,
  delay = 0,
  whileHover,
  whileTap,
  onClick,
}: MotionDivProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ ...transition, delay }}
      whileHover={whileHover}
      whileTap={whileTap}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  onClick?: () => void;
}

export function MotionCard({
  children,
  className,
  delay = 0,
  hover = true,
  onClick,
}: MotionCardProps) {
  return (
    <MotionDiv
      variants={scaleIn}
      delay={delay}
      whileHover={
        hover
          ? {
              scale: 1.02,
              y: -4,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      whileTap={hover ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </MotionDiv>
  );
}

interface MotionPageProps {
  children: ReactNode;
  className?: string;
}

export function MotionPage({ children, className }: MotionPageProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
      transition={smoothTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface MotionStaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function MotionStagger({
  children,
  className,
  staggerDelay = 0.1,
}: MotionStaggerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={staggerItem}
          transition={{ delay: index * staggerDelay }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

interface MotionGradientProps {
  children: ReactNode;
  className?: string;
  gradient?: string;
}

export function MotionGradient({
  children,
  className,
  gradient = "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
}: MotionGradientProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        `bg-gradient-to-br ${gradient}`,
        className
      )}
    >
      <motion.div
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10"
        style={{
          backgroundSize: "200% 200%",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface MotionButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MotionButton({
  children,
  className,
  onClick,
  disabled,
}: MotionButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ============================================
// Specialized Animation Components
// ============================================

interface FloatingAnimationProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function FloatingAnimation({
  children,
  className,
  intensity = 10,
}: FloatingAnimationProps) {
  return (
    <motion.div
      animate={{
        y: [0, -intensity, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface PulseGlowProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

export function PulseGlow({
  children,
  className,
  color = "violet",
}: PulseGlowProps) {
  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 20px rgba(139, 92, 246, 0.3)`,
          `0 0 40px rgba(139, 92, 246, 0.5)`,
          `0 0 20px rgba(139, 92, 246, 0.3)`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Export all
export { motion };

