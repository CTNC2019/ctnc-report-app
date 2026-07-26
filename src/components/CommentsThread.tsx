"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Reply, Users, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type Comment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  text: string;
  visibility: "all" | "selected";
  visibleTo: string[];
  createdAt: string;
};

type Member = { id: string; name: string; email: string; role: string; active: boolean };

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CommentsThread({
  reportId,
  currentUserId,
  isManager,
}: {
  reportId: string;
  currentUserId: string;
  isManager: boolean;
}) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newText, setNewText] = useState("");
  const [newVisibility, setNewVisibility] = useState<"all" | "selected">("all");
  const [newVisibleTo, setNewVisibleTo] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  function load() {
    fetch(`/api/reports/${reportId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (isManager) {
      fetch("/api/members")
        .then((r) => r.json())
        .then((d) => setMembers((d.members || []).filter((m: Member) => m.id !== currentUserId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function postComment() {
    setError("");
    const text = newText.trim();
    if (!text) return;
    if (newVisibility === "selected" && newVisibleTo.length === 0) {
      setError(t("comments.selectAtLeastOne"));
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, visibility: newVisibility, visibleTo: newVisibleTo }),
    });
    setBusy(false);
    if (res.ok) {
      setNewText("");
      setNewVisibility("all");
      setNewVisibleTo([]);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Error");
    }
  }

  async function postReply(parentId: string) {
    const text = replyText.trim();
    if (!text) return;
    setBusy(true);
    const res = await fetch(`/api/reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, parentId }),
    });
    setBusy(false);
    if (res.ok) {
      setReplyText("");
      setReplyingTo(null);
      load();
    }
  }

  function toggleMember(id: string) {
    setNewVisibleTo((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const roots = comments.filter((c) => !c.parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function descendantsOf(rootId: string): Comment[] {
    const result: Comment[] = [];
    const queue = [rootId];
    while (queue.length) {
      const pid = queue.shift()!;
      const children = comments.filter((c) => c.parentId === pid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      for (const ch of children) {
        result.push(ch);
        queue.push(ch.id);
      }
    }
    return result;
  }

  function VisibilityBadge({ c }: { c: Comment }) {
    if (c.visibility === "selected") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-warning-soft text-amber-700 border border-amber-200">
          <Users className="w-3 h-3" />
          {t("comments.visibleToCount").replace("{n}", String(c.visibleTo.length))}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success-soft text-primary-800 border border-primary-200">
        <Globe className="w-3 h-3" />
        {t("comments.visibleToAll")}
      </span>
    );
  }

  function CommentRow({ c, depth }: { c: Comment; depth: number }) {
    return (
      <div className={depth > 0 ? "mt-3 pl-4 border-l border-border-subtle" : "mt-3"}>
        <div className="p-3 bg-canvas border border-border-subtle rounded-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{c.authorName}</span>
              <span className="text-[11px] text-ink-muted">{formatDate(c.createdAt)}</span>
            </div>
            {depth === 0 && <VisibilityBadge c={c} />}
          </div>
          <p className="text-sm text-ink-secondary mt-1.5 whitespace-pre-wrap">{c.text}</p>
          <button
            onClick={() => {
              setReplyingTo(replyingTo === c.id ? null : c.id);
              setReplyText("");
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-primary-700"
          >
            <Reply className="w-3.5 h-3.5" /> {t("comments.reply")}
          </button>
          {replyingTo === c.id && (
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") postReply(c.id);
                }}
                placeholder={t("comments.replyPlaceholder")}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-border-subtle text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-500"
              />
              <button
                disabled={busy || !replyText.trim()}
                onClick={() => postReply(c.id)}
                className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold disabled:opacity-40"
              >
                {t("comments.send")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent-indigo" /> {t("comments.title")}
      </h2>

      {isManager ? (
        <div className="p-4 bg-canvas border border-border-subtle rounded-xl mb-4">
          <p className="text-xs font-semibold text-ink-secondary mb-2">{t("comments.new")}</p>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t("comments.placeholder")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white border border-border-subtle text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-500 resize-none"
          />

          <div className="mt-3">
            <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t("comments.visibility")}</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer text-ink-secondary">
                <input type="radio" checked={newVisibility === "all"} onChange={() => setNewVisibility("all")} className="accent-primary-600" />
                {t("comments.visibilityAll")}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-ink-secondary">
                <input type="radio" checked={newVisibility === "selected"} onChange={() => setNewVisibility("selected")} className="accent-primary-600" />
                {t("comments.visibilitySelected")}
              </label>
            </div>
          </div>

          {newVisibility === "selected" && (
            <div className="mt-2">
              <p className="text-xs text-ink-muted mb-1.5">{t("comments.selectMembers")}</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer ${
                      newVisibleTo.includes(m.id)
                        ? "bg-primary-50 border-primary-300 text-primary-800"
                        : "bg-white border-border-subtle text-ink-secondary"
                    }`}
                  >
                    <input type="checkbox" checked={newVisibleTo.includes(m.id)} onChange={() => toggleMember(m.id)} className="hidden" />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-danger mt-2">{error}</p>}

          <div className="flex justify-end mt-3">
            <button
              disabled={busy || !newText.trim()}
              onClick={postComment}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold disabled:opacity-40"
            >
              <Send className="w-4 h-4" /> {t("comments.post")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-muted mb-3">{t("comments.managerOnly")}</p>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">{t("common.loading")}</p>
      ) : roots.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("comments.empty")}</p>
      ) : (
        <div>
          {roots.map((r) => (
            <div key={r.id}>
              <CommentRow c={r} depth={0} />
              {descendantsOf(r.id).map((d) => (
                <CommentRow key={d.id} c={d} depth={1} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
