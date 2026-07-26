"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  color: string;
  icon: LucideIcon;
  index?: number;
};

/** KPI tile — visual refresh of the Dashboard's old inline KpiCard, now shared and
 *  animated (fade + rise on mount, staggered by `index`). */
export function StatCard({ label, value, color, icon: Icon, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="bg-surface rounded-xl p-4 shadow-sm border border-border-subtle border-l-4 transition-shadow hover:shadow-md"
      style={{ borderLeftColor: color }}
    >
      <Icon className="w-4 h-4 mb-2" style={{ color }} />
      <div className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-ink-secondary mt-1 leading-snug">{label}</div>
    </motion.div>
  );
}
