import Link from "next/link";
import { Tag as TagIcon, Calendar, ExternalLink } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface Promotion {
  id: string;
  provider_slug: string;
  provider_name_zh: string;
  title: string;
  description: string | null;
  promotion_type: string;
  gift_amount: number | null;
  gift_unit: string | null;
  discount_rate: number | null;
  ends_at: Date | null;
  source_url: string;
}

const TYPE_LABEL: Record<string, string> = {
  "new-user-gift": "新用户赠送",
  "limited-time": "限时活动",
  "quantity-discount": "量价优惠",
  "coding-plan": "编程套餐",
  "free-tier": "免费额度",
  voucher: "代金券",
  trial: "试用",
};

const TYPE_COLOR: Record<string, "primary" | "success" | "warning" | "cyan"> = {
  "new-user-gift": "success",
  "limited-time": "warning",
  "quantity-discount": "primary",
  "coding-plan": "cyan",
  "free-tier": "success",
  voucher: "primary",
  trial: "cyan",
};

export function PromotionCard({ p }: { p: Promotion }) {
  const color = TYPE_COLOR[p.promotion_type] ?? "primary";
  return (
    <div className="glass p-5 flex flex-col gap-3 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-slate-500">{p.provider_name_zh}</p>
          <h3 className="font-semibold text-sm text-white mt-0.5">{p.title}</h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
            color === "success"
              ? "bg-success/15 text-success border-success/30"
              : color === "warning"
                ? "bg-warning/15 text-warning border-warning/30"
                : color === "cyan"
                  ? "bg-cyan/15 text-cyan border-cyan/30"
                  : "bg-primary-soft text-primary border-primary/30"
          }`}
        >
          {TYPE_LABEL[p.promotion_type] ?? p.promotion_type}
        </span>
      </div>
      {p.description && <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {p.ends_at ? `截止 ${p.ends_at.toString().slice(0, 10)}` : "长期有效"}
        </span>
        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
          来源 <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
