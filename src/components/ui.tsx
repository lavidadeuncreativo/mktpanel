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

/* ---------- Button ---------- */

type ButtonVariant = "default" | "outline" | "ghost" | "danger" | "dark";
type ButtonSize = "md" | "sm" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white hover:bg-[#1d4ed8] active:bg-[#1e40af]",
  outline:
    "border border-line bg-white text-ink hover:bg-muted active:bg-[#e2e8f0]",
  ghost: "text-ink hover:bg-muted active:bg-[#e2e8f0]",
  danger: "bg-danger text-white hover:bg-[#b91c1c] active:bg-[#991b1b]",
  dark: "bg-ink text-white hover:bg-[#1e293b] active:bg-[#020617]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-[15px]",
  sm: "min-h-9 px-3 text-sm",
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
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------- Input / Textarea / Select / Label ---------- */

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted-fg/70 transition-colors duration-150 focus:border-primary focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-[15px] text-ink placeholder:text-muted-fg/70 transition-colors duration-150 focus:border-primary focus:outline-none",
        className,
      )}
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
        "h-11 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white px-3 pr-9 text-[15px] text-ink transition-colors duration-150 focus:border-primary focus:outline-none",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23475569%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat",
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
      className={cn(
        "mb-1.5 block text-sm font-medium text-ink",
        className,
      )}
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

/* ---------- Pill (status / delta / context) ---------- */

type PillTone = "neutral" | "green" | "red" | "blue" | "amber" | "teal" | "dark";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-muted text-muted-fg",
  green: "bg-accent-soft text-accent",
  red: "bg-danger-soft text-danger",
  blue: "bg-primary-soft text-primary",
  amber: "bg-amber-soft text-amber",
  teal: "bg-teal-soft text-teal-accent",
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
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-200",
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------- Dialog (accessible modal) ---------- */

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-xl border border-line bg-white p-5 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
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
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-line bg-white px-5 py-8">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-fg">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
