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

const SERIES_COLORS: Record<Network, string> = {
  facebook: "#2563eb",
  instagram: "#0d9488",
  tiktok: "#0f172a",
  youtube: "#dc2626",
};

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
          <defs>
            {networks.map((net) => (
              <linearGradient
                key={net}
                id={`area-${net}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={SERIES_COLORS[net]}
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor={SERIES_COLORS[net]}
                  stopOpacity={0.02}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#e4ecfc" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateShort(d)}
            tick={{ fill: "#475569", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fill: "#475569", fontSize: 12 }}
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
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4ecfc",
              fontSize: 13,
            }}
          />
          {networks.map((net) => (
            <Area
              key={net}
              type="monotone"
              dataKey={net}
              stroke={SERIES_COLORS[net]}
              strokeWidth={2}
              fill={`url(#area-${net})`}
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

/**
 * Donut with patterned fills instead of flat color: diagonal hatch for the
 * first segment, grid for the second, horizontal lines for the third.
 * The pattern is the memorable chart choice; the legend carries the numbers.
 */
export function NetworkDonut({
  segments,
}: {
  segments: { network: Network; label: string; views: number; pct: number }[];
}) {
  const data = segments.map((s) => ({ ...s, name: s.label }));
  const patterns: Record<string, { id: string; el: React.ReactNode }> = {
    hatch: {
      id: "pat-hatch",
      el: (
        <pattern
          id="pat-hatch"
          width="8"
          height="8"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="#f97316" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" strokeWidth="2" />
        </pattern>
      ),
    },
    grid: {
      id: "pat-grid",
      el: (
        <pattern id="pat-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#0d9488" />
          <path
            d="M 8 0 L 0 0 0 8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </pattern>
      ),
    },
    lines: {
      id: "pat-lines",
      el: (
        <pattern
          id="pat-lines"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="#facc15" />
          <line x1="0" y1="4" x2="8" y2="4" stroke="#ffffff" strokeWidth="2" />
        </pattern>
      ),
    },
    solid: {
      id: "pat-solid",
      el: (
        <pattern id="pat-solid" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#2563eb" />
        </pattern>
      ),
    },
  };
  const patternOrder = ["hatch", "grid", "lines", "solid"];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>{Object.values(patterns).map((p) => p.el)}</defs>
          <Tooltip
            formatter={(value, name) => [formatNumber(Number(value)), name]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4ecfc",
              fontSize: 13,
            }}
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
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={`url(#${patterns[patternOrder[i % patternOrder.length]].id})`}
              />
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
          <CartesianGrid stroke="#e4ecfc" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 12 }}
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
            tick={{ fill: "#475569", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [formatNumber(Number(value)), "Vistas"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4ecfc",
              fontSize: 13,
            }}
          />
          <Bar dataKey="views" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
