import { listModels } from "@/lib/db/queries";
import { PriceCalculator } from "@/components/price-calculator";
import { Calculator } from "lucide-react";

export const revalidate = 300;

export default async function CalculatorPage() {
  const models = await listModels({ limit: 200 });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> 价格计算器
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          输入你的使用量，AI 模型价格雷达会基于数据库中所有可比模型，给出三档推荐方案。
        </p>
      </header>
      <PriceCalculator models={models} />
    </div>
  );
}
