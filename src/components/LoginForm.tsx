"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, ArrowRight, Loader2, X, Mail, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui";

export default function LoginForm() {
  const { t } = useLanguage();
  const [userId, setUserId] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("ctnc_remember_userid") || ""
  );
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() =>
    typeof window === "undefined" ? false : !!window.localStorage.getItem("ctnc_remember_userid")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password, remember }),
      });
      const data = await res.json();
      if (data.success) {
        if (remember) {
          window.localStorage.setItem("ctnc_remember_userid", userId);
        } else {
          window.localStorage.removeItem("ctnc_remember_userid");
        }
        window.location.href = "/dashboard";
      } else {
        setError(t("login.error"));
      }
    } catch {
      setError(t("login.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white/80 backdrop-blur-xl border border-white shadow-xl p-8 rounded-3xl"
    >
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">{t("login.userId")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-primary-600/70" />
            </div>
            <input
              type="email"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-border-subtle rounded-xl leading-5 bg-white text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
              placeholder={t("login.userId.placeholder")}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">{t("login.password")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-primary-600/70" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-border-subtle rounded-xl leading-5 bg-white text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
              placeholder={t("login.password.placeholder")}
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-border-subtle text-primary-600 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer accent-primary-600"
          />
          <span className="text-sm text-ink-secondary">{t("login.remember")}</span>
        </label>

        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-danger text-sm bg-danger-soft p-3 rounded-lg border border-red-200"
          >
            {error}
          </motion.p>
        )}

        <Button type="submit" disabled={isLoading} className="w-full group">
          {isLoading ? (
            <><Loader2 className="animate-spin h-5 w-5 mr-2" /> {t("login.loading")}</>
          ) : (
            <>
              {t("login.submit")}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      {/* Links phía dưới form */}
      <div className="mt-6 flex justify-between items-center text-sm">
        <button
          onClick={() => setShowForgot(true)}
          className="text-primary-700/80 hover:text-primary-700 transition-colors underline underline-offset-2"
        >
          {t("login.forgotPassword")}
        </button>
        <button
          onClick={() => setShowSignup(true)}
          className="text-primary-700/80 hover:text-primary-700 transition-colors underline underline-offset-2"
        >
          {t("login.signup")}
        </button>
      </div>

      {/* Modal: Quên mật khẩu */}
      <AnimatePresence>
        {showForgot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
            onClick={() => setShowForgot(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white border border-border-subtle rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowForgot(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-canvas text-ink-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary-700" />
                </div>
                <h3 className="text-xl font-bold text-ink">{t("forgot.title")}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{t("forgot.desc")}</p>
                <div className="w-full bg-canvas rounded-2xl p-4 text-left space-y-2">
                  <p className="text-xs text-ink-muted uppercase tracking-widest font-semibold">{t("forgot.contact")}</p>
                  <p className="text-ink font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary-700" />
                    minh.hoangvan@ctnc.org.vn
                  </p>
                </div>
                <Button className="w-full" onClick={() => setShowForgot(false)}>
                  {t("forgot.understood")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Đăng ký tài khoản */}
      <AnimatePresence>
        {showSignup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
            onClick={() => setShowSignup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white border border-border-subtle rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowSignup(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-canvas text-ink-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-info-soft rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-accent-blue" />
                </div>
                <h3 className="text-xl font-bold text-ink">{t("signup.title")}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{t("signup.desc")}</p>
                <div className="w-full bg-canvas rounded-2xl p-4 text-left space-y-3">
                  <p className="text-xs text-ink-muted uppercase tracking-widest font-semibold">{t("signup.request")}</p>
                  <p className="text-ink-secondary text-sm">{t("signup.sendEmail")}</p>
                  <ul className="text-ink-secondary text-sm space-y-1 list-disc list-inside">
                    <li>{t("signup.fullName")}</li>
                    <li>{t("signup.workEmail")}</li>
                    <li>{t("signup.area")}</li>
                  </ul>
                  <p className="text-ink font-medium flex items-center gap-2 pt-1">
                    <Mail className="w-4 h-4 text-accent-blue" />
                    minh.hoangvan@ctnc.org.vn
                  </p>
                </div>
                <button onClick={() => setShowSignup(false)} className="w-full py-3 bg-accent-blue hover:bg-blue-800 text-white font-bold rounded-xl transition-colors">
                  {t("signup.understood")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
