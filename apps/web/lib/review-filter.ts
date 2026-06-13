/**
 * 评论合规过滤 —— 简单关键词 + 规则检测
 */
const FORBIDDEN_WORDS = [
  "垃圾", "最差", "智商税", "割韭菜", "吊打", "不行", "完全没必要",
  "sb", "傻逼", "脑残", "废物", "狗屎",
];

const FORBIDDEN_PATTERNS = [
  /某.*公司.*骗/,
  /这.*模型.*完全.*不行/,
  /绝对.*最强/,
];

export interface FilterResult {
  allowed: boolean;
  reason?: string;
}

export function filterReview(pros: string, cons: string): FilterResult {
  const text = `${pros} ${cons}`.toLowerCase();

  // 禁止词
  for (const w of FORBIDDEN_WORDS) {
    if (text.includes(w.toLowerCase())) {
      return { allowed: false, reason: `检测到不适当用词："${w}"` };
    }
  }

  // 禁止模式
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(text)) {
      return { allowed: false, reason: `评论内容包含攻击性或绝对化表述` };
    }
  }

  return { allowed: true };
}

/** 返回安全改写建议 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  for (const w of FORBIDDEN_WORDS) {
    if (sanitized.includes(w)) {
      sanitized = sanitized.replace(new RegExp(w, "gi"), "[已过滤]");
    }
  }
  return sanitized;
}
