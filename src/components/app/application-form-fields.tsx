import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  LANGUAGE_OPTIONS,
  cvAcceptAttr,
  readCvFile,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";

export function LanguageSelectField({
  value,
  onChange,
  lang,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  lang: "ar" | "en";
}) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else onChange([...value, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGE_OPTIONS.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-primary bg-brand text-brand-foreground shadow-glow"
                : "border-border bg-card text-muted-foreground hover:bg-secondary",
            )}
          >
            {lang === "ar" ? opt.ar : opt.en}
          </button>
        );
      })}
    </div>
  );
}

export function CvUploadField({
  fileName,
  dataUrl,
  onChange,
  lang,
  required,
}: {
  fileName: string;
  dataUrl: string;
  onChange: (next: { fileName: string; dataUrl: string }) => void;
  lang: "ar" | "en";
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const next = await readCvFile(file);
      onChange(next);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "CV_TOO_LARGE") {
        toast.error(lang === "ar" ? "حجم الملف كبير (الحد 1.5 ميجابايت)" : "File too large (max 1.5 MB)");
      } else if (code === "CV_INVALID_TYPE") {
        toast.error(lang === "ar" ? "الصيغ المسموحة: PDF, DOC, DOCX, TXT" : "Allowed: PDF, DOC, DOCX, TXT");
      } else {
        toast.error(lang === "ar" ? "تعذر قراءة الملف" : "Could not read file");
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={cvAcceptAttr()}
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {busy
            ? lang === "ar"
              ? "جاري الرفع..."
              : "Uploading..."
            : lang === "ar"
              ? "تحميل السيرة الذاتية"
              : "Upload CV"}
        </Button>
        {dataUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-lg text-destructive"
            onClick={() => onChange({ fileName: "", dataUrl: "" })}
          >
            <Trash2 className="size-3.5" />
            {lang === "ar" ? "إزالة" : "Remove"}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {lang === "ar" ? "PDF أو Word أو TXT — حتى 1.5 ميجابايت" : "PDF, Word or TXT — up to 1.5 MB"}
        {required ? (lang === "ar" ? " (مطلوب)" : " (required)") : ""}
      </p>
      {dataUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
          <FileText className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fileName || (lang === "ar" ? "ملف السيرة" : "CV file")}</p>
            <a
              href={dataUrl}
              download={fileName || "cv"}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {lang === "ar" ? "تحميل / فتح" : "Download / open"}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CvViewer({
  fileName,
  dataUrl,
  cvText,
  lang,
}: {
  fileName: string;
  dataUrl: string;
  cvText?: string;
  lang: "ar" | "en";
}) {
  if (dataUrl) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-5 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold">{fileName || (lang === "ar" ? "السيرة الذاتية" : "CV")}</p>
          </div>
          <Button asChild size="sm" className="rounded-lg bg-brand text-brand-foreground">
            <a href={dataUrl} download={fileName || "cv"} target="_blank" rel="noreferrer">
              <Download className="size-3.5" />
              {lang === "ar" ? "تحميل الملف" : "Download file"}
            </a>
          </Button>
        </div>
        {dataUrl.startsWith("data:text/plain") && cvText ? (
          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-4 font-mono text-xs leading-6 text-foreground">
            {cvText}
          </pre>
        ) : dataUrl.startsWith("data:application/pdf") ? (
          <iframe title="CV PDF" src={dataUrl} className="h-[28rem] w-full rounded-xl border border-border bg-background" />
        ) : null}
      </div>
    );
  }

  if (cvText?.trim()) {
    return (
      <pre className="whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-4 font-mono text-xs leading-6 text-foreground">
        {cvText}
      </pre>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      {lang === "ar" ? "لا توجد سيرة ذاتية مرفقة." : "No CV attached."}
    </p>
  );
}
