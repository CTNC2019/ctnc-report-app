"use client";

import { useEffect, useState } from "react";
import { Users, Plus, X, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";
import { Card, Button, Badge, PageHeader, EmptyState, Skeleton } from "@/components/ui";

type Member = { id: string; name: string; email: string; role: string; active: boolean };

const EMPTY = { userId: "", fullName: "", email: "", role: "staff", password: "" };

const inputCls = "w-full px-3 py-2 rounded-lg bg-canvas border border-border-subtle text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

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
      <div className="min-h-screen bg-canvas">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <p className="text-ink-secondary">{t("members.adminOnlyNote")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Users}
          title={t("members.title")}
          subtitle={t("members.subtitle")}
          actions={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-5 h-5" /> {t("members.add")}
            </Button>
          }
        />

        <Card padded={false} className="overflow-hidden">
          {rows === null ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} message={t("common.loading")} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b border-border-subtle">
                  <th className="px-5 py-3 font-medium">{t("members.col.id")}</th>
                  <th className="px-5 py-3 font-medium">{t("members.col.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("members.col.role")}</th>
                  <th className="px-5 py-3 font-medium">{t("members.col.email")}</th>
                  <th className="px-5 py-3 font-medium">{t("members.col.active")}</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3 font-mono text-primary-700">{m.id}</td>
                    <td className="px-5 py-3 text-ink">{m.name}</td>
                    <td className="px-5 py-3 text-ink-secondary">{t("role." + m.role) !== "role." + m.role ? t("role." + m.role) : m.role}</td>
                    <td className="px-5 py-3 text-ink-secondary">{m.email}</td>
                    <td className="px-5 py-3">
                      <Badge tone={m.active ? "success" : "danger"}>{m.active ? "✅" : "⛔"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditing(m)}>{t("reports.edit")}</Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteMember(m.id)}
                          disabled={m.id === user?.id || deletingId === m.id}
                          title={m.id === user?.id ? t("members.deleteSelfError") : t("members.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4" onClick={() => setShowAdd(false)}>
            <Card className="max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold text-ink mb-4">{t("members.add")}</h3>
              <div className="space-y-3">
                <input placeholder="User ID (CTNC-11)" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className={inputCls} />
                <input placeholder={t("members.col.name")} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                  <option value="staff">{t("role.staff")}</option>
                  <option value="manager">{t("role.manager")}</option>
                  <option value="admin">{t("role.admin")}</option>
                </select>
                <input placeholder={t("members.password")} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
                {error && <p className="text-danger text-sm">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>{t("members.cancel")}</Button>
                  <Button className="flex-1" onClick={addMember}>{t("members.save")}</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4" onClick={() => setEditing(null)}>
            <Card className="max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold text-ink mb-1 font-mono">{editing.id}</h3>
              <div className="space-y-3 mt-4">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
                <input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inputCls} />
                <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} className={inputCls}>
                  <option value="staff">{t("role.staff")}</option>
                  <option value="manager">{t("role.manager")}</option>
                  <option value="admin">{t("role.admin")}</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-ink-secondary">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> {t("members.col.active")}
                </label>
                <input placeholder={t("members.newPassword")} type="text" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>{t("members.cancel")}</Button>
                  <Button className="flex-1" onClick={saveEdit}>{t("members.save")}</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
