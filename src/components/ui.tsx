"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
} from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/* ---------- Button: capsule, Apple blue for the primary action ---------- */

type ButtonVariant = "default" | "outline" | "ghost" | "danger" | "dark";
type ButtonSize = "md" | "sm" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white hover:bg-[#0077ed] active:bg-[#0060c0]",
  outline:
    "border border-line bg-white/70 text-primary hover:bg-white active:bg-control",
  ghost: "text-primary hover:bg-primary-soft active:bg-[#d6e9fd]",
  danger: "bg-danger text-white hover:bg-[#f62e23] active:bg-[#d92b20]",
  dark: "bg-ink text-white hover:bg-[#2c2c2e] active:bg-black",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[15px]",
  sm: "min-h-9 px-3.5 text-sm",
  icon: "h-11 w-11 p-0",
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 ease-apple disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Input / Textarea / Select / Label ---------- */

const FIELD_BASE =
  "w-full rounded-[12px] border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted-fg/70 transition-colors duration-200 ease-apple focus:border-primary focus:outline-none";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11", FIELD_BASE, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 py-2.5", FIELD_BASE, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 cursor-pointer appearance-none pr-10",
        FIELD_BASE,
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236e6e73%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-sm font-medium text-ink", className)}
    >
      {children}
    </label>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </span>
      {children}
      {hint ? (
        <p className="mt-1 text-[13px] text-muted-fg">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Pill: soft tint, text dark enough to read (4.5:1) ---------- */

type PillTone =
  | "neutral"
  | "green"
  | "red"
  | "blue"
  | "amber"
  | "violet"
  | "dark";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-muted text-[#48484a]",
  green: "bg-accent-soft text-accent-text",
  red: "bg-danger-soft text-danger-text",
  blue: "bg-primary-soft text-primary-text",
  amber: "bg-amber-soft text-amber-text",
  violet: "bg-violet-soft text-violet-text",
  dark: "bg-ink text-white",
};

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Progress ---------- */

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number; // 0–100
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-control",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-300 ease-apple",
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------- Segmented control (iOS style) ---------- */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-control p-0.5"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "min-h-9 cursor-pointer rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-apple",
              active
                ? "bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                : "text-muted-fg hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Switch (iOS toggle) ---------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-[52px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-apple",
        checked ? "bg-accent" : "bg-[#e9e9ea]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 block h-7 w-7 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-apple",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/* ---------- Dialog (accessible modal, frosted sheet) ---------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-[20px] border border-line/70 bg-white/85 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-control text-muted-fg transition-colors duration-200 ease-apple hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Sheet: el detalle de un módulo, grande, con su propio scroll ----------
   En escritorio es un panel centrado (hasta 92vh); en móvil ocupa toda la
   pantalla. Un solo overlay a la vez: abrir otro módulo reemplaza este. */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm sm:p-4 sm:pt-8 lg:p-6 lg:pt-10"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full flex-col overflow-hidden bg-[#fbfbfd]/95 shadow-[0_16px_48px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:mx-auto sm:h-auto sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-[24px] sm:border sm:border-line/70"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-control text-muted-fg transition-colors duration-200 ease-apple hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- Empty state: an invitation to act, not a dead end ---------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[20px] border border-dashed border-line bg-white/60 px-5 py-8">
      <p className="text-base font-semibold tracking-[-0.01em] text-ink">
        {title}
      </p>
      <p className="max-w-md text-sm text-muted-fg">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ---------- Section heading: plain sentence-case, no eyebrow label ---------- */

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[15px] text-muted-fg">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
