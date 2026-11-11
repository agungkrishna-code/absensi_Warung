import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Icon } from "@iconify/react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const spring = { type: "spring", stiffness: 400, damping: 30, mass: 0.6 } as const;

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-stone-900 text-white shadow-sm hover:bg-stone-800 hover:shadow-md disabled:bg-stone-400 disabled:shadow-none",
  accent:
    "bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-sm shadow-teal-600/30 hover:from-teal-500 hover:to-teal-700 hover:shadow-md hover:shadow-teal-600/30 disabled:from-teal-300 disabled:to-teal-400 disabled:shadow-none disabled:cursor-not-allowed",
  secondary:
    "border border-stone-300 bg-white text-stone-800 shadow-xs hover:border-teal-400 hover:bg-teal-50",
  ghost: "text-stone-600 hover:bg-teal-50 hover:text-stone-900",
  danger: "bg-rose-500 text-white shadow-sm shadow-rose-500/25 hover:bg-rose-600",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ y: 1, scale: 0.98 }}
      transition={spring}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not--allowed",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props as HTMLMotionProps<"button">}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={spring}
      className={cn(
        "rounded-2xl border border-stone-200/60 bg-white/85 shadow-(--shadow-card) backdrop-blur-sm transition-[border-color,box-shadow] duration-200 hover:border-teal-300 hover:shadow-(--shadow-card-hover)",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100/80 bg-gradient-to-r from-teal-50/80 to-violet-50/50 px-5 py-4 sm:px-6">
      <div>
        <h2 className="font-semibold tracking-tight text-stone-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-stone-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-6 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h1 className="bg-gradient-to-r from-teal-700 via-violet-700 to-orange-600 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">{title}</h1>
        {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      </div>
      {action}
    </motion.div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-stone-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/15 focus:shadow-none disabled:cursor-not-allowed disabled:bg-stone-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("cursor-text", controlClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("cursor-pointer", controlClass, className)} {...props}>
      {children}
    </select>
  );
}

type BadgeTone = "present" | "late" | "absent" | "neutral" | "admin";

const badgeTones: Record<BadgeTone, { dot: string; pill: string }> = {
  present: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  late: { dot: "bg-orange-400", pill: "bg-orange-50 text-orange-700 ring-orange-200" },
  absent: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-200" },
  neutral: { dot: "bg-stone-400", pill: "bg-stone-100 text-stone-600 ring-stone-200" },
  admin: { dot: "bg-violet-300", pill: "bg-violet-100 text-violet-800 ring-violet-200" },
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeTones[tone].pill,
      )}
    >
      <span className={cn("size-1.5 rounded-full", badgeTones[tone].dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "teal" | "violet" | "orange" | "rose" | "sky";
}) {
  const tones = {
    teal: "from-teal-500 to-emerald-500",
    violet: "from-violet-500 to-fuchsia-500",
    orange: "from-orange-400 to-amber-500",
    rose: "from-rose-500 to-pink-500",
    sky: "from-sky-500 to-indigo-500",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 24, mass: 0.7 }}
    >
      <Card className="relative overflow-hidden p-5">
        <span
          className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", tones[tone])}
          aria-hidden="true"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-stone-500">{label}</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
              className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-stone-900"
            >
              {value}
            </motion.p>
            {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
          </div>
          {icon ? (
            <motion.span
              initial={{ rotate: -8, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                tones[tone],
              )}
            >
              {icon}
            </motion.span>
          ) : null}
        </div>
      </Card>
    </motion.div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center gap-2 px-5 py-12 text-center"
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 via-violet-500 to-orange-400 text-white shadow-sm"
        aria-hidden="true"
      >
        <Icon icon="ph:tray" width={22} />
      </motion.span>
      <p className="mt-1 font-medium text-stone-700">{title}</p>
      {description ? <p className="text-sm text-stone-500">{description}</p> : null}
    </motion.div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900",
        className,
      )}
      role="status"
      aria-label="Memuat"
    />
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };
  return (
    <div
      className={cn("rounded-xl border px-3.5 py-2.5 text-sm ring-1 ring-inset ring-transparent", tones[tone])}
      role="alert"
    >
      {children}
    </div>
  );
}
