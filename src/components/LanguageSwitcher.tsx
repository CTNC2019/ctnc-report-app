"use client";

import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-md">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setLang("vi")}
        title="Tiếng Việt"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          lang === "vi"
            ? "bg-white text-slate-800 shadow-md"
            : "text-white/60 hover:text-white"
        }`}
      >
        <span className="text-base leading-none">🇻🇳</span>
        <span className={lang === "vi" ? "block" : "hidden sm:block"}>VI</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setLang("en")}
        title="English"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          lang === "en"
            ? "bg-white text-slate-800 shadow-md"
            : "text-white/60 hover:text-white"
        }`}
      >
        <span className="text-base leading-none">🇬🇧</span>
        <span className={lang === "en" ? "block" : "hidden sm:block"}>EN</span>
      </motion.button>
    </div>
  );
}
