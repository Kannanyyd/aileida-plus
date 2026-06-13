import { Sparkles, Users, AlertTriangle, Lightbulb, ThumbsUp, Info } from "lucide-react";

interface StrengthsData {
  strengths: { name_zh: string; category: string }[];
}

const STRENGTH_DESCRIPTIONS: Record<string, { suitableFor: string; suggestion: string; notSuitableFor?: string }> = {
  "chinese-writing":      { suitableFor: "内容团队、个人创作者、中文营销文案", suggestion: "在中文长文本生成、改写和润色方面反馈较多，适合需要自然流畅中文表达的场景", notSuitableFor: "如果需要较强的逻辑严谨性或专业领域术语，建议结合实际测试" },
  "code-generation":      { suitableFor: "软件开发、自动化脚本、编程学习", suggestion: "在常见编程语言和主流框架上有较好表现，适合作为 AI 编程助手", notSuitableFor: "对特定领域或企业私有代码库，需要单独测试上下文理解能力" },
  "complex-reasoning":    { suitableFor: "学术分析、策略研究、复杂决策支持", suggestion: "适合多步骤推理和需要深层逻辑分析的场景", notSuitableFor: "对极高频实时调用，可能存在响应时间较长的情况" },
  "long-text-analysis":   { suitableFor: "长文档处理、合同分析、学术文献阅读", suggestion: "支持较长上下文，适合一次性处理整篇文档或长对话历史", notSuitableFor: "文档结构复杂或需要跨段落精确引用时，建议先用样本验证" },
  "document-summary":     { suitableFor: "新闻摘要、会议记录整理、文献综述", suggestion: "适合快速提取长文本的关键信息和摘要", notSuitableFor: "对摘要风格有特定要求（如学术/口语化）时，建议通过提示词调整" },
  "multi-turn-dialogue":  { suitableFor: "AI 客服、智能助手、教育对话", suggestion: "在多轮交互中能较好维持上下文连贯性", notSuitableFor: "超长对话历史可能导致响应时间增加" },
  "agent-tool-use":       { suitableFor: "AI Agent、自动化工作流、工具集成", suggestion: "支持函数调用和工具链编排，适合构建自动化 Agent", notSuitableFor: "复杂多工具协同场景需要额外的错误处理和回退机制" },
  "function-calling":     { suitableFor: "结构化数据提取、API 编排、格式约束输出", suggestion: "支持通过函数调用获取外部数据或控制输出格式", notSuitableFor: "首次使用时注意检查参数传递的准确性" },
  "json-output":          { suitableFor: "数据抽取、结构化问答、自动化报表", suggestion: "良好支持 JSON 格式输出，适合需要结构化数据的场景", notSuitableFor: "复杂嵌套结构需要仔细设计 schema" },
  "multimodal-understanding": { suitableFor: "图片分析、多模态问答、视觉搜索", suggestion: "支持图片+文本混合输入", notSuitableFor: "图片质量较低或信息密度大时效果可能有差异" },
  "low-cost":             { suitableFor: "预算敏感型项目、大规模调用、原型开发", suggestion: "在当前收录价格中属于较低区间，适合高频调用的成本控制", notSuitableFor: "成本低可能伴随服务等级或功能的限制，请参考官方 SLA" },
  "high-concurrency":     { suitableFor: "生产级应用、高并发服务、实时系统", suggestion: "适合需要稳定高并发处理的生产环境", notSuitableFor: "注意各厂商的 QPS/TPS 限制和配额管理" },
  "cn-payment-friendly":  { suitableFor: "国内开发者、企业用户、人民币结算需求", suggestion: "支持微信/支付宝/企业转账等国内付款方式", notSuitableFor: "具体付款方式和发票政策以厂商官方为准" },
  "beginner-friendly":    { suitableFor: "AI 新手、教育场景、快速原型开发", suggestion: "API 接入简单，文档清晰，适合第一次使用 AI API 的用户", notSuitableFor: "复杂高阶功能可能需要查阅更深入的文档" },
};

const CATEGORY_LABELS: Record<string, string> = {
  capability: "能力",
  scenario: "场景",
  audience: "适合人群",
  price: "价格",
  region: "地区",
};

export function ModelStrengthsSection({ strengths, modelName }: { strengths: StrengthsData["strengths"]; modelName: string }) {
  const byCategory: Record<string, typeof strengths> = {};
  for (const s of strengths) {
    (byCategory[s.category] ??= []).push(s);
  }

  // 找相关描述
  const sKey = strengths[0]?.name_zh ?? "";
  const desc = Object.entries(STRENGTH_DESCRIPTIONS).find(([k]) =>
    strengths.some((s) => k.replace(/-/g, "") === s.name_zh.replace(/\s/g, "").toLowerCase()),
  );

  return (
    <div className="glass p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" /> 擅长方向与适用建议
      </h2>

      {/* 擅长方向标签 */}
      <div className="space-y-2">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] text-slate-500 mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((s) => (
                <span key={s.name_zh} className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {s.name_zh}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 使用建议 */}
      {desc && (
        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-cyan mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-0.5">适合用户</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">{desc[1].suitableFor}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-0.5">使用建议</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">{desc[1].suggestion}</p>
            </div>
          </div>
          {desc[1].notSuitableFor && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning/60 mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 leading-relaxed">{desc[1].notSuitableFor}</p>
            </div>
          )}
        </div>
      )}

      {!desc && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-0.5">使用建议</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                建议根据你的具体使用场景和任务特征，结合官方文档和实际测试结果来判断{modelName}是否适合你的需求。本站提示的擅长方向基于已收录的模型信息和用户反馈整理，仅供参考。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 免责声明组件 */
export function SiteDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] text-slate-600 leading-relaxed">
        本站展示的模型价格、优惠信息、能力标签和用户点评均基于公开资料、官方信息、用户反馈及系统规则整理，仅供参考。实际价格、功能和服务条款以各模型服务商官方页面为准。本站不隶属于任何模型服务商，也不代表任何服务商作出承诺或评价。
      </p>
    );
  }
  return (
    <div className="glass p-4 space-y-2">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-500 mt-px shrink-0" />
        <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
          <p>
            本站展示的模型价格、优惠信息、能力标签和用户点评均基于公开资料、官方信息、用户反馈及系统规则整理，仅供参考。实际价格、功能和服务条款以各模型服务商官方页面为准。本站不隶属于相关模型服务商，也不代表任何服务商作出承诺或评价。
          </p>
          <p>
            用户点评仅代表个人体验，不构成本站对相关模型或服务商的事实认定。本站会对明显攻击性、诋毁性、无依据指控或违法违规内容进行处理。
          </p>
          <p>
            模型推荐结果基于用户输入需求和当前收录数据自动生成，不构成购买建议、商业承诺或服务保证。用户应结合自身业务需求、预算、合规要求和实际测试结果自行判断。
          </p>
        </div>
      </div>
    </div>
  );
}
