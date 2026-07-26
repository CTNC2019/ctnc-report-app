"use client";

import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

// Real SVG flags instead of Unicode flag emoji — emoji flags render as plain two-letter
// country codes ("VN" / "GB") on Windows browsers that lack the regional-indicator emoji
// font, so an SVG is the only way to guarantee a flag actually renders everywhere.
function VNFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        points="15,4 16.76,9.29 22.35,9.29 17.8,12.71 19.55,18 15,14.59 10.45,18 12.2,12.71 7.65,9.29 13.24,9.29"
        fill="#FFCD00"
      />
    </svg>
  );
}

function GBFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <rect width="60" height="30" fill="#00247D" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#CF142B" strokeWidth="2" />
      <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#CF142B" strokeWidth="6" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 border border-border-subtle">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setLang("vi")}
        title="Tiếng Việt"
        aria-label="Tiếng Việt"
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 overflow-hidden ${
          lang === "vi" ? "ring-2 ring-primary-600 shadow-sm" : "opacity-50 hover:opacity-90"
        }`}
      >
        <VNFlag className="w-full h-full object-cover" />
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setLang("en")}
        title="English"
        aria-label="English"
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 overflow-hidden ${
          lang === "en" ? "ring-2 ring-primary-600 shadow-sm" : "opacity-50 hover:opacity-90"
        }`}
      >
        <GBFlag className="w-full h-full object-cover" />
      </motion.button>
    </div>
  );
}
