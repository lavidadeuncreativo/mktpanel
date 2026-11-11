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
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { cn } from "./cn";

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/* ---------- Entrada escalonada: una sola vez al pintar la pantalla ----------
   Rápida y sutil (200 ms, 50 ms entre tarjetas). Solo se usa en las
   pantallas con tarjetas (Métricas, Contenido); el chat ya anima sus
   mensajes y MotionConfig reducedMotion="user" la apaga si el sistema
   lo pide. */

export function Stagger({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Cifra: el valor final, directo, sin animación ----------
   Antes era un count-up con muelle que empezaba en 0 en cada montaje:
   al navegar entre pestañas las cifras se veían a mitad de camino y
   cambiaban en cada visita (4,314 / 15,753 / 14,748 para el mismo
   dato). Las métricas muestran su valor final real desde el primer
   render, siempre idéntico. `format` es el formateo existente
   (formatNumber). */

export function AnimatedNumber({
  value,
  format = (n: number) => String(n),
}: {
  value: number;
  format?: (n: number) => string;
}) {
  return <span className="tabular-nums">{format(value)}</span>;
}

/* ---------- Button: capsule, Apple blue for the primary action ---------- */

type ButtonVariant = "default" | "outline" | "ghost" | "danger" | "dark";
type ButtonSize = "md" | "sm" | "icon" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  /* Primary: warm red with white text — the one accent. */
  default:
    "bg-primary text-white hover:bg-[#b42318] active:bg-[#991b1b]",
  outline:
    "border border-line bg-card text-primary hover:bg-black/[0.03] active:bg-black/[0.05]",
  ghost: "text-primary hover:bg-primary-soft active:bg-black/[0.04]",
  danger: "bg-danger text-white hover:bg-[#b91c1c] active:bg-[#991b1b]",
  dark: "bg-ink text-white hover:bg-ink/85 active:bg-ink/70",
};

/* The rounding lives in the size: md/sm/icon stay capsule, lg is the big
   iOS rounded-rectangle action (one per screen). cn() is a plain join,
   so rounding must never be set in two places at once. */
const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 rounded-full px-5 text-[15px]",
  sm: "min-h-9 rounded-full px-3.5 text-sm",
  icon: "h-11 w-11 rounded-full p-0",
  lg: "min-h-[52px] w-full rounded-[12px] px-6 text-[17px] font-semibold",
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
        "inline-flex cursor-pointer items-center justify-center gap-2 font-medium transition-colors duration-200 ease-apple disabled:cursor-not-allowed disabled:opacity-50",
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
  "w-full rounded-[10px] border border-line bg-page px-3.5 text-[15px] text-ink placeholder:text-muted-fg/70 transition-colors duration-200 ease-apple focus:border-primary focus:outline-none";

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
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23a1a1aa%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat",
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
  neutral: "bg-black/[0.05] text-[#57534e]",
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
                ? "bg-white text-ink shadow-[0_1px_4px_rgba(28,25,23,0.18)]"
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

/* Visual only: when the whole row is the button, the switch must not be
   a nested <button>. The row carries the click and the aria-label. */
export function SwitchVisual({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 ease-apple",
        checked ? "bg-accent" : "bg-black/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 block h-7 w-7 rounded-full bg-white shadow-[0_1px_4px_rgba(28,25,23,0.25)] transition-transform duration-200 ease-apple",
          checked && "translate-x-5",
        )}
      />
    </span>
  );
}

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
      className="shrink-0 cursor-pointer rounded-full"
    >
      <SwitchVisual checked={checked} />
    </button>
  );
}

/* ---------- iOS grouped lists: Ajustes-style rows ----------
   Un grupo = un contenedor blanco redondeado con filas de 44pt y
   separadores inset (el divisor empieza después del icono, como en
   Ajustes). Lo tocable lleva chevron o switch; lo demás es texto plano. */

export function SectionHeader({
  title,
  meta,
}: {
  title: string;
  /** Plain secondary text on the right (a count, never a tiny button). */
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-1.5">
      <h2 className="text-[13px] font-semibold text-muted-fg">{title}</h2>
      {meta ? (
        <span className="text-[13px] text-muted-fg">{meta}</span>
      ) : null}
    </div>
  );
}

export function GroupedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border border-line bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RowChevron() {
  return (
    <ChevronRight
      className="h-5 w-5 shrink-0 text-black/25"
      aria-hidden="true"
    />
  );
}

export function GroupedRow({
  icon,
  title,
  titleClassName,
  subtitle,
  accessory,
  onClick,
  divider = false,
  ariaLabel,
  className,
}: {
  /** Rendered inside the standard 29px icon chip. Omit for text-only rows. */
  icon?: ReactNode;
  title: string;
  titleClassName?: string;
  subtitle?: string;
  accessory?: ReactNode;
  /** Present = the whole 44pt row is tappable (chevron/switch affordance). */
  onClick?: () => void;
  /** Inset top divider: true for every row except the first. */
  divider?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const content = (
    <>
      {icon ? (
        <span
          className="flex w-[52px] shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] bg-control text-ink">
            {icon}
          </span>
        </span>
      ) : null}
      <span
        className={cn(
          "flex min-h-11 flex-1 items-center gap-3 py-2",
          icon ? "pr-4" : "px-4",
          divider && "border-t border-line/70",
        )}
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[17px] leading-snug text-ink",
              titleClassName,
            )}
          >
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-[15px] leading-snug text-muted-fg">
              {subtitle}
            </span>
          ) : null}
        </span>
        {accessory}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full cursor-pointer items-stretch text-left transition-colors duration-150 ease-apple hover:bg-black/[0.03] active:bg-black/[0.05]",
          className,
        )}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cn("flex w-full items-stretch text-left", className)}>
      {content}
    </div>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-[16px] border border-line bg-card p-5 shadow-[0_16px_48px_rgba(28,25,23,0.18)]"
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
    <div className="flex flex-col items-start gap-2 rounded-[16px] border border-dashed border-line bg-card px-5 py-8">
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
