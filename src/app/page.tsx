"use client";

import LoginForm from "@/components/LoginForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-canvas flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-200/40 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-100/50 blur-[120px]" />

      {/* Language Switcher - top right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-ink mb-2 tracking-tight">{t("app.title")}</h1>
          <p className="text-primary-700/80">{t("app.subtitle")}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
