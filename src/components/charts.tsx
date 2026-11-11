"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NETWORK_LABELS } from "@/lib/types";
import type { MetricSnapshot, Network } from "@/lib/types";
import { formatDateShort, formatNumber } from "@/lib/store";

/** One quiet color per network, tuned to read on white. */
export const NETWORK_COLORS: Record<Network, string> = {
  facebook: "#1877f2",
  instagram: "#e1306c",
  tiktok: "#1c1917",
  youtube: "#dc2626",
  threads: "#737373",
};

const SERIES_COLORS = NETWORK_COLORS;

const GRID_STROKE = "rgba(28,25,23,0.08)";
const TICK_FILL = "#a8a29e";

const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  borderRadius: 10,
  border: "1px solid rgba(28,25,23,0.10)",
  boxShadow: "0 12px 32px rgba(28,25,23,0.14)",
  fontSize: 13,
  color: "#1c1917",
} as const;

const TOOLTIP_LABEL_STYLE = { color: "#1c1917" } as const;
const TOOLTIP_ITEM_STYLE = { color: "#1c1917" } as const;

/** Dark tooltip chip for the Overview bars, like the reference's
 *  "$1,548.24 for April 2026" chip: dark pill on the light chart. */
const DARK_TOOLTIP_STYLE = {
  backgroundColor: "#1c1917",
  borderRadius: 10,
  border: "1px solid #1c1917",
  boxShadow: "0 12px 32px rgba(28,25,23,0.25)",
  fontSize: 13,
  color: "#ffffff",
} as const;

const DARK_TOOLTIP_LABEL_STYLE = { color: "#ffffff" } as const;
const DARK_TOOLTIP_ITEM_STYLE = { color: "#ffffff" } as const;

/** Followers over time, one series per network. Real captures only. */
export function FollowersArea({
  snapshots,
}: {
  snapshots: MetricSnapshot[];
}) {
  const networks = Array.from(
    new Set(snapshots.map((s) => s.network)),
  ) as Network[];

  const byDate = new Map<string, Record<string, number | string>>();
  for (const s of snapshots) {
    const row = byDate.get(s.date) ?? { date: s.date };
    row[s.network] = s.followers;
    byDate.set(s.date, row);
  }
  const data = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  if (data.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateShort(d)}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value, name) => [
              formatNumber(Number(value)),
              NETWORK_LABELS[name as Network] ?? String(name),
            ]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          {networks.map((net) => (
            <Area
              key={net}
              type="monotone"
              dataKey={net}
              stroke={SERIES_COLORS[net]}
              strokeWidth={2}
              fill={SERIES_COLORS[net]}
              fillOpacity={0.05}
              dot={{ r: 4, fill: SERIES_COLORS[net], strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut in flat network colors; the legend carries the numbers. */
export function NetworkDonut({
  segments,
}: {
  segments: { network: Network; label: string; views: number; pct: number }[];
}) {
  const data = segments.map((s) => ({ ...s, name: s.label }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          <Pie
            data={data}
            dataKey="views"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((s) => (
              <Cell key={s.network} fill={SERIES_COLORS[s.network]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Views per capture, zero-based domain, one bar per capture.
 *  Reference language: pale bars, the most recent capture highlighted
 *  in the warm red accent, dark tooltip chip on hover. */
export function ViewsBars({
  snapshots,
}: {
  snapshots: MetricSnapshot[];
}) {
  const data = [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      label: `${NETWORK_LABELS[s.network]} ${formatDateShort(s.date)}`,
      views: s.views,
    }));

  if (data.length === 0) return null;

  const latestDate = data[data.length - 1].date;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.length > 2 ? -18 : 0}
            textAnchor={data.length > 2 ? "end" : "middle"}
            height={data.length > 2 ? 56 : 30}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), "Vistas"]}
            contentStyle={DARK_TOOLTIP_STYLE}
            labelStyle={DARK_TOOLTIP_LABEL_STYLE}
            itemStyle={DARK_TOOLTIP_ITEM_STYLE}
          />
          <Bar
            dataKey="views"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell
                key={d.label}
                fill={d.date === latestDate ? "#d92d20" : "#e8e2d8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny sparkline for a KPI card: one metric summed per capture date.
 *  Returns null when there is a single point — a trend line through one
 *  dot would be a lie, and the card says "Línea base" instead. */
export function Sparkline({
  data,
  color,
}: {
  data: { date: string; value: number }[];
  color: string;
}) {
  if (data.length < 2) return null;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="none"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Views over time, one line per network. Real captures only: with a
 *  single capture date the chart shows one dot per network and the card
 *  explains that the trend appears with the second capture. */
export function ViewsLine({
  series,
}: {
  series: {
    date: string;
    facebook?: number;
    instagram?: number;
    tiktok?: number;
    youtube?: number;
    threads?: number;
  }[];
}) {
  const networks = Array.from(
    new Set(
      series.flatMap((row) =>
        (["facebook", "instagram", "tiktok", "youtube", "threads"] as Network[]).filter(
          (k) => typeof row[k] === "number",
        ),
      ),
    ),
  ) as Network[];

  if (series.length === 0) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateShort(d)}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fill: TICK_FILL, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [
              formatNumber(Number(value)),
              NETWORK_LABELS[name as Network] ?? String(name),
            ]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
          />
          {networks.map((net) => (
            <Area
              key={net}
              type="monotone"
              dataKey={net}
              stroke={SERIES_COLORS[net]}
              strokeWidth={2}
              fill={SERIES_COLORS[net]}
              fillOpacity={0.05}
              dot={{ r: 3.5, fill: SERIES_COLORS[net], strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
