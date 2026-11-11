"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { usePanel } from "./panel-context";
import type { MetricSnapshot, Network, WorkspaceId } from "@/lib/types";
import { NETWORK_LABELS } from "@/lib/types";
import { formatDateShort, formatNumber, uid } from "@/lib/store";
import { Button, Field, Select } from "./ui";

/* ------------------------------------------------------------------ */
/* CSV de Business Suite: el formato exacto de Meta cambia y no lo     */
/* inventamos. El usuario mapea las columnas a mano; eso es lo que     */
/* hace robusto el importador.                                         */
/* ------------------------------------------------------------------ */

const TEMPLATE_HEADERS = [
  "fecha",
  "red",
  "seguidores",
  "vistas",
  "reacciones",
  "comentarios",
  "compartidos",
  "periodo",
];

const TEMPLATE_EXAMPLE = [
  "2026-11-10",
  "instagram",
  "42",
  "3172",
  "13",
  "0",
  "2",
  "Últimos 30 días",
];

type FieldKey =
  | "date"
  | "followers"
  | "views"
  | "reactions"
  | "comments"
  | "shares"
  | "network"
  | "period";

type Mapping = Record<FieldKey, string>;

const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: "date", label: "Fecha", required: true },
  { key: "network", label: "Red", required: false },
  { key: "followers", label: "Seguidores", required: false },
  { key: "views", label: "Vistas / alcance", required: false },
  { key: "reactions", label: "Reacciones / me gusta", required: false },
  { key: "comments", label: "Comentarios", required: false },
  { key: "shares", label: "Compartidos", required: false },
  { key: "period", label: "Periodo", required: false },
];

const SYNONYMS: Record<FieldKey, string[]> = {
  date: ["fecha", "date", "dia"],
  network: ["red", "network", "plataforma", "platform"],
  followers: ["seguidores", "followers", "fans"],
  views: ["vistas", "alcance", "views", "reach", "reproducciones", "visualizaciones", "plays"],
  reactions: ["reacciones", "megusta", "likes", "reactions"],
  comments: ["comentarios", "comments"],
  shares: ["compartidos", "shares", "compartidas"],
  period: ["periodo", "period"],
};

const NETWORK_WORDS: Record<string, Network> = {
  facebook: "facebook",
  fb: "facebook",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  yt: "youtube",
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

/** Minimal RFC-4180-ish parser: quotes, escaped quotes, embedded newlines. */
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const delim = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

/** "3,172" / "3.172" / "3,17" / "1 234" → number. Null when unreadable. */
function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[\s\u00a0'"]/g, "");
  if (s === "") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (
      parts.length > 1 &&
      parts.slice(1).every((g) => /^\d{3}$/.test(g)) &&
      /^\d{1,3}$/.test(parts[0])
    ) {
      s = parts.join("");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    // "3.172" es miles con punto (formato europeo); "3.17" es decimal.
    const parts = s.split(".");
    if (
      parts.length > 1 &&
      parts.slice(1).every((g) => /^\d{3}$/.test(g)) &&
      /^\d{1,3}$/.test(parts[0])
    ) {
      s = parts.join("");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Accepts 2026-11-10, 10/11/2026 and 10-11-2026. Returns ISO or null. */
function parseDate(raw: string): string | null {
  const s = raw.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return null;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

function parseNetworkCell(raw: string): Network | null {
  const key = raw.trim().toLowerCase();
  return NETWORK_WORDS[key] ?? null;
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.join(",")].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla-captura.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface ImportResult {
  imported: number;
  skipped: number;
  reasons: string[];
  firstDate: string | null;
  lastDate: string | null;
}

export function CsvImport({
  workspaceId,
  onClose,
}: {
  workspaceId: WorkspaceId;
  onClose: () => void;
}) {
  const { data, update } = usePanel();
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    date: "",
    network: "",
    followers: "",
    views: "",
    reactions: "",
    comments: "",
    shares: "",
    period: "",
  });
  const [network, setNetwork] = useState<Network>("instagram");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const autoMap = (headers: string[]) => {
    const normalized = headers.map(normalizeHeader);
    const next: Mapping = {
      date: "",
      network: "",
      followers: "",
      views: "",
      reactions: "",
      comments: "",
      shares: "",
      period: "",
    };
    (Object.keys(SYNONYMS) as FieldKey[]).forEach((field) => {
      const idx = normalized.findIndex((h) => SYNONYMS[field].includes(h));
      if (idx >= 0) next[field] = headers[idx];
    });
    setMapping(next);
  };

  const onFile = async (file: File) => {
    setError("");
    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("El archivo no tiene filas de datos. Revisa que sea un CSV con encabezados.");
        return;
      }
      const headers = parsed[0].map((h) => h.trim());
      setFileName(file.name);
      setColumns(headers);
      setRows(parsed.slice(1));
      autoMap(headers);
    } catch {
      setError("No se pudo leer el archivo. Prueba con un CSV exportado de Business Suite.");
    }
  };

  const preview = useMemo(() => rows.slice(0, 4), [rows]);

  const cellFor = (row: string[], field: FieldKey): string => {
    const col = mapping[field];
    if (!col) return "";
    const idx = columns.indexOf(col);
    return idx >= 0 ? (row[idx] ?? "") : "";
  };

  const doImport = () => {
    if (!mapping.date) {
      setError("Elige qué columna es la fecha. Sin fecha no se puede crear la captura.");
      return;
    }
    const ws = data[workspaceId];
    const existing = new Set(
      ws.snapshots.map((s) => `${s.network}|${s.date}`),
    );
    const created: MetricSnapshot[] = [];
    const reasons: string[] = [];
    let skipped = 0;
    rows.forEach((row, i) => {
      const line = i + 2; // +1 header, +1 because humans count from 1
      const date = parseDate(cellFor(row, "date"));
      if (!date) {
        skipped += 1;
        reasons.push(`Fila ${line}: fecha no válida (“${cellFor(row, "date")}”).`);
        return;
      }
      const rowNetwork = mapping.network
        ? parseNetworkCell(cellFor(row, "network"))
        : null;
      const net = rowNetwork ?? network;
      if (mapping.network && !rowNetwork) {
        skipped += 1;
        reasons.push(`Fila ${line}: red no reconocida (“${cellFor(row, "network")}”).`);
        return;
      }
      if (existing.has(`${net}|${date}`)) {
        skipped += 1;
        reasons.push(
          `Fila ${line}: ya existe una captura de ${NETWORK_LABELS[net]} del ${formatDateShort(date)}.`,
        );
        return;
      }
      const num = (field: FieldKey) => parseNumber(cellFor(row, field)) ?? 0;
      const periodCell = cellFor(row, "period").trim();
      created.push({
        id: uid(),
        network: net,
        date,
        period: periodCell || "Importado desde CSV",
        followers: num("followers"),
        views: num("views"),
        reactions: num("reactions"),
        comments: num("comments"),
        shares: num("shares"),
        interactions: null,
        source: "csv",
      });
      existing.add(`${net}|${date}`);
    });

    if (created.length > 0) {
      const dates = created.map((s) => s.date).sort();
      update((d) => ({
        ...d,
        [workspaceId]: {
          ...d[workspaceId],
          snapshots: [...d[workspaceId].snapshots, ...created],
          log: [
            ...d[workspaceId].log,
            {
              id: uid(),
              date: dates[dates.length - 1],
              text: `Importado desde CSV “${fileName}”: ${created.length} captura${created.length === 1 ? "" : "s"} de ${NETWORK_LABELS[network]} (${formatDateShort(dates[0])} – ${formatDateShort(dates[dates.length - 1])}). ${skipped > 0 ? `${skipped} fila${skipped === 1 ? "" : "s"} omitida${skipped === 1 ? "" : "s"}.` : ""}`,
              source: "Importación CSV",
            },
          ],
        },
      }));
    }
    setResult({
      imported: created.length,
      skipped,
      reasons: reasons.slice(0, 6),
      firstDate: created.length > 0 ? created.map((s) => s.date).sort()[0] : null,
      lastDate:
        created.length > 0
          ? created.map((s) => s.date).sort()[created.length - 1]
          : null,
    });
  };

  if (result) {
    return (
      <div className="space-y-4">
        <p className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink">
          {result.imported} captura{result.imported === 1 ? "" : "s"} importada
          {result.imported === 1 ? "" : "s"}
        </p>
        {result.firstDate ? (
          <p className="text-sm text-muted-fg">
            Del {formatDateShort(result.firstDate)} al{" "}
            {formatDateShort(result.lastDate ?? result.firstDate)}.
          </p>
        ) : null}
        {result.skipped > 0 ? (
          <div className="rounded-[12px] bg-amber-soft p-4">
            <p className="text-sm font-semibold text-amber-text">
              {result.skipped} fila{result.skipped === 1 ? "" : "s"} omitida
              {result.skipped === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-amber-text">
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
              {result.skipped > result.reasons.length ? (
                <li>Y {result.skipped - result.reasons.length} más.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-muted-fg">
          Las capturas ya aparecen en Métricas y en la bitácora. Los deltas y
          la curva se activan cuando una red tiene dos capturas.
        </p>
        <div className="flex justify-end">
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1: file + network */}
      <div>
        <label
          htmlFor="csv-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border border-dashed border-line bg-card/60 px-4 py-6 text-center transition-colors duration-200 ease-apple hover:border-primary"
        >
          <FileSpreadsheet
            className="h-6 w-6 text-muted-fg"
            aria-hidden="true"
          />
          <span className="text-[15px] font-medium text-ink">
            {fileName || "Sube el CSV exportado de Business Suite"}
          </span>
          <span className="text-xs text-muted-fg">
            Arrastra el archivo o toca para elegirlo. Se lee en tu navegador,
            nada sale de aquí.
          </span>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar plantilla CSV
          </Button>
          <span className="text-xs text-muted-fg">
            La plantilla trae los encabezados que el importador reconoce.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Red de las capturas">
          <Select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
          >
            {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABELS[n]}
              </option>
            ))}
          </Select>
        </Field>
        <p className="self-end text-xs text-muted-fg">
          Si tu CSV trae una columna de red, esa manda por fila.
        </p>
      </div>

      {/* Step 2: mapping + preview */}
      {columns.length > 0 ? (
        <>
          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Mapea las columnas
            </p>
            <p className="mb-3 text-xs text-muted-fg">
              El importador detectó estas columnas en tu archivo; corrige el
              mapeo si algo quedó mal.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
                  <Select
                    value={mapping[f.key]}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                    }
                  >
                    <option value="">Sin mapear</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">
              Vista previa ({formatNumber(rows.length)} filas)
            </p>
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted-fg">
                    <th scope="col" className="px-3 py-2 font-medium">Fecha</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Seguidores</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Vistas</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Reacciones</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-ink">
                        {parseDate(cellFor(row, "date")) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-ink">
                        {formatNumber(parseNumber(cellFor(row, "followers")) ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-ink">
                        {formatNumber(parseNumber(cellFor(row, "views")) ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-ink">
                        {formatNumber(parseNumber(cellFor(row, "reactions")) ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={doImport} disabled={!mapping.date}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar {formatNumber(rows.length)} filas
            </Button>
          </div>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
