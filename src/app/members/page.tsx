"use client";

import { useEffect, useState } from "react";
import { Users, Plus, X, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

type Member = { id: string; name: string; email: string; role: string; active: boolean };

const EMPTY = { userId: "", fullName: "", email: "", role: "staff", password: "" };

export default function MembersPage() {
  const { t } = useLanguage();
  const { user, isAdmin, loading } = useSession();
  const [rows, setRows] = useState<Member[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setRows(d.members || []));
  }
  useEffect(load, []);

  async function addMember() {
    setError("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error || "error");
      return;
    }
    setShowAdd(false);
    setForm(EMPTY);
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    const body: Record<string, unknown> = { fullName: editing.name, email: editing.email, role: editing.role, active: editing.active };
    if (pw) body.password = pw;
    await fetch(`/api/members/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditing(null);
    setPw("");
    load();
  }

  async function deleteMember(id: string) {
    if (!confirm(t("members.deleteConfirm"))) return;
    setDeletingId(id);
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error === "cannot delete yourself" ? t("members.deleteSelfError") : data.error || "Error");
    }
  }

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-slate-400">{t("members.adminOnlyNote")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="w-7 h-7 text-emerald-400" /> {t("members.title")}
            </h1>
            <p className="text-slate-400">{t("members.subtitle")}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" /> {t("members.add")}
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-5 py-3">{t("members.col.id")}</th>
                <th className="px-5 py-3">{t("members.col.name")}</th>
                <th className="px-5 py-3">{t("members.col.role")}</th>
                <th className="px-5 py-3">{t("members.col.email")}</th>
                <th className="px-5 py-3">{t("members.col.active")}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows === null && <tr><td colSpan={6} className="px-5 py-6 text-slate-500">{t("common.loading")}</td></tr>}
              {rows?.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-5 py-3 font-mono text-emerald-300">{m.id}</td>
                  <td className="px-5 py-3">{m.name}</td>
                  <td className="px-5 py-3 text-slate-300">{t("role." + m.role) !== "role." + m.role ? t("role." + m.role) : m.role}</td>
                  <td className="px-5 py-3 text-slate-400">{m.email}</td>
                  <td className="px-5 py-3">{m.active ? "✅" : "⛔"}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(m)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"
                      >
                        {t("reports.edit")}
                      </button>
                      <button
                        onClick={() => deleteMember(m.id)}
                        disabled={m.id === user?.id || deletingId === m.id}
                        title={m.id === user?.id ? t("members.deleteSelfError") : t("members.delete")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowAdd(false)}>
            <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold text-white mb-4">{t("members.add")}</h3>
              <div className="space-y-3">
                <input placeholder="User ID (CTNC-11)" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <input placeholder={t("members.col.name")} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm">
                  <option value="staff">{t("role.staff")}</option>
                  <option value="manager">{t("role.manager")}</option>
                  <option value="admin">{t("role.admin")}</option>
                </select>
                <input placeholder={t("members.password")} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 text-sm">{t("members.cancel")}</button>
                  <button onClick={addMember} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 font-bold text-sm">{t("members.save")}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setEditing(null)}>
            <div className="bg-slate-800 border border-white/10 rounded-3xl p-6 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold text-white mb-1">{editing.id}</h3>
              <div className="space-y-3 mt-4">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm">
                  <option value="staff">{t("role.staff")}</option>
                  <option value="manager">{t("role.manager")}</option>
                  <option value="admin">{t("role.admin")}</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> {t("members.col.active")}
                </label>
                <input placeholder={t("members.newPassword")} type="text" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 text-sm">{t("members.cancel")}</button>
                  <button onClick={saveEdit} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-slate-900 font-bold text-sm">{t("members.save")}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
