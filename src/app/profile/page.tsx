"use client";

import { useEffect, useRef, useState } from "react";
import { UserCircle, Camera, Loader2, Save, KeyRound, CheckCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";

type Profile = { id: string; name: string; email: string; role: string; avatarUrl: string };

export default function ProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  function load() {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setName(d.profile.name);
        }
      });
  }
  useEffect(load, []);

  async function handleAvatarChange(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: data.url }),
        });
        load();
      }
    } finally {
      setUploading(false);
    }
  }

  async function saveInfo() {
    setSavingInfo(true);
    setInfoSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      if (res.ok) {
        setInfoSaved(true);
        load();
      }
    } finally {
      setSavingInfo(false);
    }
  }

  async function updatePassword() {
    setPwError("");
    setPwSaved(false);
    if (newPassword.length < 6) {
      setPwError(t("profile.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("profile.passwordMismatch"));
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwSaved(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwError(data.error === "current password incorrect" ? t("login.error") : data.error || "Error");
      }
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <UserCircle className="w-7 h-7 text-emerald-400" /> {t("profile.title")}
          </h1>
          <p className="text-slate-400">{t("profile.subtitle")}</p>
        </div>

        {!profile ? (
          <p className="text-slate-400">{t("common.loading")}</p>
        ) : (
          <div className="space-y-6">
            {/* Avatar + basic info */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={profile.name} className="w-20 h-20 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
                      <UserCircle className="w-12 h-12 text-slate-500" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-slate-900 disabled:opacity-60"
                    title={t("profile.changeAvatar")}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarChange(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div>
                  <p className="font-mono text-emerald-300 text-sm">{profile.id}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("role." + profile.role) !== "role." + profile.role ? t("role." + profile.role) : profile.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-100 mb-2">{t("profile.fullName")}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-100 mb-2">{t("profile.email")}</label>
                  <input
                    disabled
                    value={profile.email}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-500 opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">{t("profile.emailNote")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={saveInfo}
                  disabled={savingInfo || !name.trim()}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-bold disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {t("profile.saveInfo")}
                </button>
                {infoSaved && (
                  <span className="text-emerald-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {t("profile.saved")}
                  </span>
                )}
              </div>
            </div>

            {/* Change password */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" /> {t("profile.changePassword")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-100 mb-2">{t("login.password")}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-100 mb-2">{t("profile.newPassword")}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-100 mb-2">{t("profile.confirmPassword")}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              {pwError && <p className="text-red-400 text-sm mt-3">{pwError}</p>}
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={updatePassword}
                  disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" /> {t("profile.updatePassword")}
                </button>
                {pwSaved && (
                  <span className="text-emerald-400 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {t("profile.saved")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
