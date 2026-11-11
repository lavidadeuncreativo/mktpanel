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
import type { MetricSnapshot, Network } from "@/lib/types";
import { formatDateShort, formatNumber } from "@/lib/store";

/** One quiet color per network; Apple blue leads. */
export const NETWORK_COLORS: Record<Network, string> = {
  facebook: "#0071e3",
  instagram: "#af52de",
  tiktok: "#1d1d1f",
  youtube: "#ff3b30",
};

const SERIES_COLORS = NETWORK_COLORS;

const GRID_STROKE = "#e8e8ed";
const TICK_FILL = "#6e6e73";

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid #d2d2d7",
  boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
  fontSize: 13,
} as const;

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
              name === "facebook"
                ? "Facebook"
                : name === "instagram"
                  ? "Instagram"
                  : name === "tiktok"
                    ? "TikTok"
                    : "YouTube",
            ]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={TOOLTIP_STYLE}
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

/** Views per capture, zero-based domain, one bar per capture. */
export function ViewsBars({
  snapshots,
}: {
  snapshots: MetricSnapshot[];
}) {
  const data = [...snapshots]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      label: `${s.network === "facebook" ? "Facebook" : s.network === "instagram" ? "Instagram" : s.network === "tiktok" ? "TikTok" : "YouTube"} ${formatDateShort(s.date)}`,
      views: s.views,
    }));

  if (data.length === 0) return null;

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
            contentStyle={TOOLTIP_STYLE}
          />
          <Bar dataKey="views" fill="#0071e3" radius={[4, 4, 0, 0]} />
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
  }[];
}) {
  const networks = Array.from(
    new Set(
      series.flatMap((row) =>
        (["facebook", "instagram", "tiktok", "youtube"] as Network[]).filter(
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
              name === "facebook"
                ? "Facebook"
                : name === "instagram"
                  ? "Instagram"
                  : name === "tiktok"
                    ? "TikTok"
                    : "YouTube",
            ]}
            labelFormatter={(label) => formatDateShort(String(label))}
            contentStyle={TOOLTIP_STYLE}
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
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
