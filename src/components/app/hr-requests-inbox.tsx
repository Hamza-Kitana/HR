import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { EmployeeNameCell } from "@/components/app/employee-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  formatRequestWhen,
  requestTypeLabel,
  useHrRequests,
  type HrRequest,
  type RequestType,
} from "@/lib/hr-requests";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useStaff } from "@/lib/staff";

export function HrRequestsInbox({
  type,
  titleKey,
  descriptionAr,
  descriptionEn,
}: {
  type: RequestType;
  titleKey: TranslationKey;
  descriptionAr: string;
  descriptionEn: string;
}) {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin, session, reload } = useAuth();
  const { getStaff, updateStaff } = useStaff();
  const { requests, decideRequest } = useHrRequests();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const canManage =
    isSuperAdmin ||
    (type === "leave" && can("hr.leaves.manage")) ||
    (type === "resignation" && can("hr.resignations.manage")) ||
    (type === "contact_change" && can("hr.contact.manage"));
  const actor = session?.userId ? getStaff(session.userId) : undefined;

  const filtered = useMemo(
    () =>
      requests
        .filter((r) => r.type === type)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, type],
  );

  const pending = filtered.filter((r) => r.status === "pending").length;
  const approved = filtered.filter((r) => r.status === "approved").length;
  const rejected = filtered.filter((r) => r.status === "rejected").length;

  function decide(request: HrRequest, status: "approved" | "rejected") {
    if (!canManage || !actor) {
      toast.error(lang === "ar" ? "ما عندك صلاحية قرار HR" : "No HR decide permission");
      return;
    }
    const result = decideRequest({
      requestId: request.id,
      status,
      actor,
      ...(notes[request.id]?.trim() ? { note: notes[request.id]!.trim() } : {}),
    });
    if (!result.ok) {
      toast.error(lang === "ar" ? "تعذّر تنفيذ القرار" : "Could not decide");
      return;
    }

    if (status === "approved" && request.type === "contact_change") {
      const patch: { email?: string; phone?: string } = {};
      if (request.newEmail) patch.email = request.newEmail;
      if (request.newPhone) patch.phone = request.newPhone;
      if (Object.keys(patch).length) {
        updateStaff(request.employeeId, patch);
        void reload();
      }
    }

    toast.success(
      status === "approved"
        ? lang === "ar"
          ? request.type === "contact_change"
            ? "تمت الموافقة وتحديث بيانات الموظف فوراً"
            : "تمت الموافقة — وصل إشعار للموظف"
          : request.type === "contact_change"
            ? "Approved — employee contact updated"
            : "Approved — employee notified"
        : lang === "ar"
          ? "تم الرفض — وصل إشعار للموظف"
          : "Rejected — employee notified",
    );
  }

  const isLeave = type === "leave";
  const isContact = type === "contact_change";

  return (
    <>
      <PageHeader title={titleKey} description={lang === "ar" ? descriptionAr : descriptionEn} />

      {!canManage ? (
        <div className="mb-4 rounded-xl border border-border bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {lang === "ar"
            ? "عرض فقط. قرارات الموافقة تحتاج صلاحية HR المناسبة."
            : "View only. Decisions require the matching HR permission."}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={lang === "ar" ? "بانتظار القرار" : "Pending"} value={pending} />
        <StatCard label={t("leave.approved")} value={approved} />
        <StatCard label={t("leave.rejected")} value={rejected} />
      </div>

      <DataTable
        headers={[
          t("att.employee"),
          ...(isLeave
            ? [t("leave.type"), lang === "ar" ? "الفترة" : "Period"]
            : isContact
              ? [lang === "ar" ? "التعديل المطلوب" : "Requested change"]
              : [lang === "ar" ? "آخر يوم عمل" : "Last working day"]),
          t("leave.reason"),
          t("common.status"),
          lang === "ar" ? "تاريخ الطلب" : "Submitted",
          t("common.actions"),
        ]}
        rows={filtered.map((row) => {
          const emp = getStaff(row.employeeId);
          const contactSummary = [
            row.newEmail
              ? `${lang === "ar" ? "إيميل" : "Email"}: ${row.currentEmail || "—"} → ${row.newEmail}`
              : null,
            row.newPhone
              ? `${lang === "ar" ? "هاتف" : "Phone"}: ${row.currentPhone || "—"} → ${row.newPhone}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return [
            <EmployeeNameCell
              key={`${row.id}-emp`}
              name={row.employeeName}
              src={emp?.avatarUrl ?? null}
            />,
            ...(isLeave
              ? [
                  row.leaveType ?? "—",
                  <span key={`${row.id}-d`}>
                    {row.from} → {row.to}
                  </span>,
                ]
              : isContact
                ? [
                    <span key={`${row.id}-c`} className="text-xs leading-relaxed" dir="ltr">
                      {contactSummary || "—"}
                    </span>,
                  ]
                : [
                    <span key={`${row.id}-d`} className="font-mono text-sm" dir="ltr">
                      {row.lastDay ?? "—"}
                    </span>,
                  ]),
            row.reason || requestTypeLabel(row.type, lang),
            <StatusBadge
              key={`${row.id}-s`}
              tone={row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "danger"}
            >
              {row.status === "approved"
                ? t("leave.approved")
                : row.status === "pending"
                  ? t("leave.pending")
                  : t("leave.rejected")}
            </StatusBadge>,
            formatRequestWhen(row.createdAt),
            row.status === "pending" && canManage ? (
              <div key={`${row.id}-a`} className="min-w-[14rem] space-y-2">
                <Input
                  placeholder={lang === "ar" ? "ملاحظة للموظف (اختياري)" : "Note to employee (optional)"}
                  value={notes[row.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  className="h-9 rounded-lg"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => decide(row, "approved")}>
                    {t("leave.approve")}
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => decide(row, "rejected")}>
                    {t("leave.reject")}
                  </Button>
                </div>
              </div>
            ) : row.decidedByName ? (
              <span key={`${row.id}-done`} className="text-xs text-muted-foreground">
                {row.decidedByName}
                {row.decisionNote ? ` · ${row.decisionNote}` : ""}
              </span>
            ) : (
              "—"
            ),
          ];
        })}
      />
    </>
  );
}
