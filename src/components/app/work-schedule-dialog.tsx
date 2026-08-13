import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { hoursBetween, isValidTime, WEEKDAY_LABELS } from "@/lib/shifts";
import { useStaff, type StaffRecord } from "@/lib/staff";
import { cn } from "@/lib/utils";

export function WorkScheduleDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: StaffRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lang } = useI18n();
  const { updateStaff } = useStaff();
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [workHours, setWorkHours] = useState("8");

  useEffect(() => {
    if (!employee || !open) return;
    setWorkDays([...employee.workDays]);
    setWorkStart(employee.workStart || "08:00");
    setWorkEnd(employee.workEnd || "16:00");
    setWorkHours(String(employee.workHours || 8));
  }, [employee, open]);

  const suggestedHours = hoursBetween(workStart, workEnd);

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  function handleSave() {
    if (!employee) return;
    if (workDays.length === 0) {
      toast.error(lang === "ar" ? "اختر يوم دوام واحد على الأقل" : "Pick at least one work day");
      return;
    }
    if (!isValidTime(workStart) || !isValidTime(workEnd)) {
      toast.error(lang === "ar" ? "حدد من ساعة إلى ساعة بشكل صحيح" : "Set a valid from–to time");
      return;
    }
    const hours = Number(workHours);
    if (!hours || hours <= 0) {
      toast.error(lang === "ar" ? "ساعات الدوام لازم تكون أكبر من صفر" : "Work hours must be greater than zero");
      return;
    }
    updateStaff(employee.id, {
      workDays,
      workStart,
      workEnd,
      workHours: hours,
    });
    toast.success(lang === "ar" ? "تم حفظ جدول الدوام" : "Schedule saved");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,28rem)] max-w-none gap-0 overflow-hidden rounded-3xl border-border p-0 shadow-lift">
        <DialogHeader className="border-b border-border bg-card px-4 py-4 text-start sm:px-6 sm:py-5 sm:text-start">
          <DialogTitle className="font-display text-xl font-bold">
            {lang === "ar" ? "جدول الدوام (من–إلى)" : "Work schedule (from–to)"}
          </DialogTitle>
          <DialogDescription>
            {employee?.full_name}
            {employee ? ` · @${employee.username}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-2">
            <Label>{lang === "ar" ? "أيام الدوام" : "Work days"}</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((d) => {
                const on = workDays.includes(d.day);
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => toggleDay(d.day)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                      on
                        ? "bg-brand text-brand-foreground shadow-glow"
                        : "border border-border bg-background text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {lang === "ar" ? d.ar : d.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from">{lang === "ar" ? "من الساعة" : "From"}</Label>
              <Input
                id="from"
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                dir="ltr"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">{lang === "ar" ? "إلى الساعة" : "To"}</Label>
              <Input
                id="to"
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                dir="ltr"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">{lang === "ar" ? "ساعات الدوام (حرة)" : "Work hours (free)"}</Label>
            <Input
              id="hours"
              type="number"
              min={0.25}
              step={0.25}
              value={workHours}
              onChange={(e) => setWorkHours(e.target.value)}
              dir="ltr"
              className="h-11 rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={!suggestedHours}
              onClick={() => suggestedHours && setWorkHours(String(suggestedHours))}
            >
              {lang === "ar"
                ? suggestedHours
                  ? `احسب من الوقت (${suggestedHours})`
                  : "احسب من الوقت"
                : suggestedHours
                  ? `Use span (${suggestedHours})`
                  : "Use time span"}
            </Button>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" className="rounded-xl bg-brand text-brand-foreground shadow-glow" onClick={handleSave}>
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
