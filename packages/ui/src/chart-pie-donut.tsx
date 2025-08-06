"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { Pie, PieChart } from "recharts";

import { CardContent } from "./card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

export const description = "A donut chart showing budget usage";

interface ChartPieDonutProps {
  availableAmount?: number;
  totalUsed?: number;
  className?: string;
}

const chartConfig = {
  amount: {
    label: "금액",
  },
  used: {
    label: "사용금액",
    color: "hsl(var(--chart-1))",
  },
  available: {
    label: "잔여금액",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ChartPieDonut({ availableAmount = 0, totalUsed = 0, className }: ChartPieDonutProps) {
  const balance = availableAmount - totalUsed;
  const usagePercentage = availableAmount > 0 ? (totalUsed / availableAmount) * 100 : 0;

  const chartData = [
    {
      category: "used",
      amount: totalUsed,
      fill: "red",
      label: "사용금액",
    },
    {
      category: "available",
      amount: Math.max(0, balance),
      fill: "gray",
      label: "잔여금액",
    },
  ].filter((item) => item.amount > 0); // Only show segments with positive amounts

  return (
    <div className={className}>
      <CardContent className="flex p-0 justify-between items-center ">
        <div className="relative">
          <ChartContainer config={chartConfig} className="aspect-square w-[113px]">
            <PieChart width={113} height={113}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name === "used" ? "사용금액" : "잔여금액"]} />}
              />
              <Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={55} cornerRadius={8} width={113} height={113} />
            </PieChart>
          </ChartContainer>

          {/* Center text showing usage percentage */}
          <div className="absolute left-1/2 top-9 -translate-x-1/2  flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-base font-bold text-gray-900">{usagePercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">사용률</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]"></div>
              <span className="text-sm w-20 text-gray-400">총 금액</span>
            </div>
            <span className="font-medium text-sm ">{availableAmount.toLocaleString()}원</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]"></div>
              <span className="text-sm w-20 text-gray-400">사용금액</span>
            </div>
            <span className="font-medium text-sm">{totalUsed.toLocaleString()}원</span>
          </div>
          <hr />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]"></div>
              <span className="text-sm w-20 text-gray-400">잔여금액</span>
            </div>
            <span className="font-medium text-sm">{Math.max(0, balance).toLocaleString()}원</span>
          </div>
          <div className="flex items-center gap-2 leading-none font-medium text-xs pt-2">
            {balance >= 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">예산 내 사용 중</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">예산 초과 {Math.abs(balance).toLocaleString()}원</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
