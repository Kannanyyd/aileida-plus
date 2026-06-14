"use client";

import { useState } from "react";

export function ReviewActions({ id, payload }: { id: string; payload: Record<string, any> }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState("");

  async function post(action: "approve" | "reject" | "ignore" | "needs-more-info", body: Record<string, any> = {}) {
    setBusy(action);
    setResult("");
    const res = await fetch(`/api/admin/review-queue/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, message }),
    });
    const json = await res.json();
    setBusy("");
    setResult(res.ok ? `${action} ok` : json.error ?? `${action} failed`);
  }

  return (
    <div className="glass p-4 space-y-3">
      <p className="text-sm font-semibold text-white">Actions</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Audit note"
        className="h-20 w-full rounded border border-white/10 bg-black/20 p-2 text-xs text-white"
      />
      <div className="grid gap-2 md:grid-cols-4">
        <button disabled={!!busy} onClick={() => post("approve", payload)} className="rounded bg-success/20 px-3 py-2 text-xs font-semibold text-success">
          {busy === "approve" ? "Approving..." : "Approve pricing"}
        </button>
        <button disabled={!!busy} onClick={() => post("ignore")} className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200">
          {busy === "ignore" ? "Ignoring..." : "Ignore"}
        </button>
        <button disabled={!!busy} onClick={() => post("needs-more-info")} className="rounded bg-warning/20 px-3 py-2 text-xs font-semibold text-warning">
          {busy === "needs-more-info" ? "Saving..." : "Needs more info"}
        </button>
        <button disabled={!!busy} onClick={() => post("reject")} className="rounded bg-danger/20 px-3 py-2 text-xs font-semibold text-danger">
          {busy === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {result && <p className="text-xs text-slate-300">{result}</p>}
    </div>
  );
}
