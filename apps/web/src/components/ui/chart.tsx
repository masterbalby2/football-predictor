"use client";

import * as React from "react";
import {
  Line,
  LineChart as RechartsLineChart,
  Bar,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipProps,
} from "recharts";

const MONO_STROKE = "#ffffff";
const MONO_FILL = "#ffffff";
const GRID_STROKE = "#333333";
const AXIS_STROKE = "#666666";

function MonoTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      {label != null && <div className="mb-1 text-muted-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="font-mono tabular-nums">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          {p.unit ? p.unit : "%"}
        </div>
      ))}
    </div>
  );
}

interface LineChartProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  series: { key: string; name: string }[];
  height?: number;
  yUnit?: string;
}

export function LineChart({ data, xKey, series, height = 200, yUnit }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={AXIS_STROKE}
          tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={AXIS_STROKE}
          tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${yUnit ?? "%"}`}
        />
        <RechartsTooltip content={<MonoTooltip />} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={MONO_STROKE}
            strokeWidth={1.5}
            dot={{ r: 2, fill: MONO_FILL }}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  series: { key: string; name: string }[];
  height?: number;
  yUnit?: string;
}

export function BarChart({ data, xKey, series, height = 200, yUnit }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke={AXIS_STROKE}
          tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={AXIS_STROKE}
          tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}${yUnit ?? ""}`}
        />
        <RechartsTooltip content={<MonoTooltip />} cursor={{ fill: "#222" }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={MONO_FILL} />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
