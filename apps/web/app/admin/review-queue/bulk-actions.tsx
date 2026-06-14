"use client";

import { useEffect, useState } from "react";

export function BulkActions({ ids }: { ids: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState("");

  function toggle(id: string, checked: boolean) {
    setSelected((cur) => checked ? [...new Set([...cur, id])] : cur.filter((x) => x !== id));
  }

  useEffect(() => {
    function onChange(event: Event) {
      const target = event.target as HTMLInputElement | null;
      const id = target?.getAttribute("data-row-review-id");
      if (id && target) toggle(id, target.checked);
    }
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, []);

  async function run(status: "ignored_duplicate" | "needs_more_info" | "rejected", label: string) {
    setBusy(status);
    setResult("");
    const res = await fetch("/api/admin/review-queue/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: selected, status, message: label }),
    });
    const json = await res.json();
    setBusy("");
    setResult(res.ok ? `${label}: ${json.count}` : json.error ?? "Bulk operation failed");
  }

  return (
    <div className="glass p-3 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-slate-400">Selected {selected.length}</span>
        <button type="button" onClick={() => setSelected(ids)} className="rounded bg-white/10 px-2 py-1 text-slate-200">Select page</button>
        <button type="button" onClick={() => setSelected([])} className="rounded bg-white/10 px-2 py-1 text-slate-200">Clear</button>
        <button disabled={!selected.length || !!busy} type="button" onClick={() => run("ignored_duplicate", "bulk ignore duplicates")} className="rounded bg-white/10 px-2 py-1 text-slate-200">Bulk ignore duplicates</button>
        <button disabled={!selected.length || !!busy} type="button" onClick={() => run("needs_more_info", "bulk mark needs_more_info")} className="rounded bg-warning/20 px-2 py-1 text-warning">Needs more info</button>
        <button disabled={!selected.length || !!busy} type="button" onClick={() => run("rejected", "bulk reject suspicious")} className="rounded bg-danger/20 px-2 py-1 text-danger">Reject suspicious</button>
      </div>
      {result && <p className="text-slate-400">{result}</p>}
    </div>
  );
}
