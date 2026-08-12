import { Camera, UserRound } from "lucide-react";
import { useRef, type ChangeEvent } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "size-8 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Stable soft gradient from a name/username */
export function avatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hues = [168, 198, 210, 145, 32, 255, 280, 12];
  const hue = hues[hash % hues.length]!;
  return {
    background: `linear-gradient(145deg, hsl(${hue} 52% 42%), hsl(${(hue + 28) % 360} 48% 28%))`,
  };
}

export function EmployeeAvatar({
  name,
  src,
  size = "md",
  className,
  rounded = "full",
}: {
  name: string;
  src?: string | null | undefined;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  rounded?: "full" | "2xl" | "xl";
}) {
  const roundClass = rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : "rounded-xl";
  const tone = avatarTone(name || "user");

  return (
    <Avatar className={cn(SIZE_CLASS[size], roundClass, "ring-2 ring-background shadow-sm", className)}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback
        className={cn(roundClass, "font-display font-bold text-white")}
        style={tone}
        delayMs={src ? 200 : 0}
      >
        {initials(name) || <UserRound className="size-[45%]" />}
      </AvatarFallback>
    </Avatar>
  );
}

export function EmployeeNameCell({
  name,
  src,
  subtitle,
  size = "sm",
}: {
  name: string;
  src?: string | null | undefined;
  subtitle?: string;
  size?: "xs" | "sm" | "md";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <EmployeeAvatar name={name} src={src} size={size} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

/** Resize + compress image for localStorage-friendly avatars */
export function fileToAvatarDataUrl(file: File, maxPx = 320, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not_image"));
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      reject(new Error("too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function EmployeeAvatarUploader({
  name,
  src,
  onChange,
  disabled,
  lang = "ar",
  size = "xl",
}: {
  name: string;
  src?: string | null | undefined;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  lang?: "ar" | "en";
  size?: "lg" | "xl";
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      onChange(dataUrl);
    } catch {
      /* keep previous photo */
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative shrink-0 disabled:cursor-not-allowed disabled:opacity-60",
          !disabled && "cursor-pointer",
        )}
        title={lang === "ar" ? "تغيير الصورة" : "Change photo"}
      >
        <EmployeeAvatar name={name || (lang === "ar" ? "موظف" : "Employee")} src={src} size={size} rounded="2xl" />
        {!disabled ? (
          <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-6 text-white" />
          </span>
        ) : null}
      </button>
      <div className="space-y-2 text-center sm:text-start">
        <p className="text-sm font-semibold">{lang === "ar" ? "صورة الموظف" : "Employee photo"}</p>
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? "JPG أو PNG — تظهر بالبروفايل والجداول" : "JPG or PNG — shown on profile and tables"}
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
            onClick={() => inputRef.current?.click()}
          >
            {lang === "ar" ? "رفع صورة" : "Upload"}
          </button>
          {src ? (
            <button
              type="button"
              disabled={disabled}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              onClick={() => onChange(null)}
            >
              {lang === "ar" ? "إزالة" : "Remove"}
            </button>
          ) : null}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
