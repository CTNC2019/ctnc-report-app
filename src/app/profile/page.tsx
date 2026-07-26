"use client";

import { useEffect, useRef, useState } from "react";
import { UserCircle, Camera, Loader2, Save, KeyRound, CheckCircle } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { Card, Button, PageHeader } from "@/components/ui";

type Profile = { id: string; name: string; email: string; role: string; avatarUrl: string };

const inputCls = "w-full px-4 py-2.5 bg-canvas border border-border-subtle rounded-xl text-ink focus:ring-2 focus:ring-primary-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-ink mb-2";

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
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader icon={UserCircle} title={t("profile.title")} subtitle={t("profile.subtitle")} />

        {!profile ? (
          <p className="text-ink-secondary">{t("common.loading")}</p>
        ) : (
          <div className="space-y-6">
            {/* Avatar + basic info */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={profile.name} className="w-20 h-20 rounded-full object-cover border border-border-subtle" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-canvas border border-border-subtle flex items-center justify-center">
                      <UserCircle className="w-12 h-12 text-ink-muted" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-700 flex items-center justify-center text-white disabled:opacity-60"
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
                  <p className="font-mono text-primary-700 text-sm">{profile.id}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {t("role." + profile.role) !== "role." + profile.role ? t("role." + profile.role) : profile.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("profile.fullName")}</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("profile.email")}</label>
                  <input disabled value={profile.email} className={inputCls + " text-ink-muted opacity-70 cursor-not-allowed"} />
                  <p className="text-xs text-ink-muted mt-1.5">{t("profile.emailNote")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5">
                <Button onClick={saveInfo} disabled={savingInfo || !name.trim()}>
                  <Save className="w-4 h-4" /> {t("profile.saveInfo")}
                </Button>
                {infoSaved && (
                  <span className="text-primary-700 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {t("profile.saved")}
                  </span>
                )}
              </div>
            </Card>

            {/* Change password */}
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-700" /> {t("profile.changePassword")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>{t("login.password")}</label>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("profile.newPassword")}</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t("profile.confirmPassword")}</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
                </div>
              </div>
              {pwError && <p className="text-danger text-sm mt-3">{pwError}</p>}
              <div className="flex items-center gap-3 mt-5">
                <Button
                  variant="secondary"
                  onClick={updatePassword}
                  disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}
                >
                  <KeyRound className="w-4 h-4" /> {t("profile.updatePassword")}
                </Button>
                {pwSaved && (
                  <span className="text-primary-700 text-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {t("profile.saved")}
                  </span>
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
