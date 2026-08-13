import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Printer } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { EmployeeAvatar, EmployeeNameCell } from "@/components/app/employee-avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  activeContractFor,
  buildDemoContractBody,
  contractStatusLabel,
  contractStatusTone,
  contractTypeLabel,
  contractsForEmployee,
  useContracts,
  type ContractStatus,
  type ContractType,
  type EmploymentContract,
} from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";
import { useStaff, type StaffRecord } from "@/lib/staff";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contracts")({
  ssr: false,
  head: () => ({ meta: [{ title: "عقود العمل | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: ContractsPage,
});

function ContractsPage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin } = useAuth();
  const { staff, getStaff } = useStaff();
  const { contracts, upsertContract, deleteContract } = useContracts();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = isSuperAdmin || can("hr.contracts.manage");

  const employees = useMemo(
    () => staff.filter((s) => s.is_active && s.username !== "sadmin"),
    [staff],
  );

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return employees
      .map((emp) => {
        const list = contractsForEmployee(contracts, emp.id);
        const current = activeContractFor(contracts, emp.id);
        return { emp, list, current };
      })
      .filter(({ emp, current }) => {
        if (!query) return true;
        return (
          emp.full_name.toLowerCase().includes(query) ||
          emp.department.toLowerCase().includes(query) ||
          (current?.title ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.emp.full_name.localeCompare(b.emp.full_name, "ar"));
  }, [employees, contracts, q]);

  const selected = selectedId
    ? contracts.find((c) => c.id === selectedId) ?? null
    : null;
  const selectedEmp = selected ? getStaff(selected.employeeId) : undefined;

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const renewalCount = contracts.filter((c) => c.status === "renewal").length;
  const endedCount = contracts.filter((c) => c.status === "ended").length;

  return (
    <AppShell title="nav.contracts">
      <PageHeader
        title="nav.contracts"
        description={
          lang === "ar"
            ? "كل موظف مربوط بعقد عمله. اضغط لعرض العقد كاملًا أو أنشئ عقدًا جديدًا."
            : "Each employee is linked to their contract. Click to view the full contract or create a new one."
        }
        action={
          canManage ? (
            <Button
              type="button"
              className="rounded-xl bg-brand text-brand-foreground shadow-glow"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              {lang === "ar" ? "عقد جديد" : "New contract"}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={lang === "ar" ? "عقود نشطة" : "Active"} value={activeCount} />
        <StatCard label={lang === "ar" ? "بحاجة تجديد" : "Renewal"} value={renewalCount} />
        <StatCard label={lang === "ar" ? "منتهية" : "Ended"} value={endedCount} />
        <StatCard label={lang === "ar" ? "الموظفون" : "Employees"} value={employees.length} />
      </div>

      <div className="mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "بحث عن موظف أو عقد..." : "Search employee or contract..."}
          className="max-w-md rounded-xl"
        />
      </div>

      <DataTable
        onRowClick={(idx) => {
          const row = rows[idx];
          if (row?.current) setSelectedId(row.current.id);
          else if (row && canManage) {
            setCreateOpen(true);
          }
        }}
        headers={[
          t("att.employee"),
          lang === "ar" ? "العقد" : "Contract",
          lang === "ar" ? "النوع" : "Type",
          lang === "ar" ? "البداية" : "Start",
          lang === "ar" ? "النهاية" : "End",
          lang === "ar" ? "الراتب" : "Salary",
          t("common.status"),
        ]}
        rows={rows.map(({ emp, current, list }) => [
          <EmployeeNameCell
            key={emp.id}
            name={emp.full_name}
            src={emp.avatarUrl}
            subtitle={`${emp.job_title} · ${emp.department}`}
          />,
          current ? (
            <span key={`${emp.id}-t`} className="font-medium">
              {current.title}
              {list.length > 1 ? (
                <span className="ms-1 text-xs text-muted-foreground">(+{list.length - 1})</span>
              ) : null}
            </span>
          ) : (
            <span key={`${emp.id}-t`} className="text-muted-foreground">
              {lang === "ar" ? "لا يوجد عقد" : "No contract"}
            </span>
          ),
          current ? contractTypeLabel(current.type, lang) : "—",
          current?.startDate ?? "—",
          current?.endDate || (current ? (lang === "ar" ? "مفتوح" : "Open") : "—"),
          current ? (
            <span key={`${emp.id}-s`} dir="ltr">
              {current.salary.toLocaleString("en-GB")} JOD
            </span>
          ) : (
            "—"
          ),
          current ? (
            <StatusBadge key={`${emp.id}-st`} tone={contractStatusTone(current.status)}>
              {contractStatusLabel(current.status, lang)}
            </StatusBadge>
          ) : (
            <StatusBadge key={`${emp.id}-st`} tone="neutral">
              {lang === "ar" ? "بدون عقد" : "None"}
            </StatusBadge>
          ),
        ])}
      />

      <ContractViewDialog
        contract={selected}
        employee={selectedEmp}
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelectedId(null);
        }}
        canManage={canManage}
        lang={lang}
        onDelete={() => {
          if (!selected) return;
          deleteContract(selected.id);
          setSelectedId(null);
          toast.success(lang === "ar" ? "تم حذف العقد" : "Contract deleted");
        }}
      />

      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        lang={lang}
        onCreate={(emp, data) => {
          const created = upsertContract(emp, data);
          toast.success(lang === "ar" ? "تم حفظ عقد العمل" : "Contract saved");
          setCreateOpen(false);
          if (created) setSelectedId(created.id);
        }}
      />
    </AppShell>
  );
}

function ContractViewDialog({
  contract,
  employee,
  open,
  onOpenChange,
  canManage,
  lang,
  onDelete,
}: {
  contract: EmploymentContract | null;
  employee?: StaffRecord | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canManage: boolean;
  lang: "ar" | "en";
  onDelete: () => void;
}) {
  if (!contract) return null;
  const c = contract;

  function printContract() {
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) {
      toast.error(lang === "ar" ? "اسمح بالنوافذ المنبثقة" : "Allow popups");
      return;
    }
    win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${c.title}</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;margin:32px;line-height:1.8;color:#122}
        h1{color:#0f766e;font-size:22px;margin-bottom:8px}
        .meta{color:#556;font-size:13px;margin-bottom:20px}
        pre{white-space:pre-wrap;font-family:Tahoma,Arial,sans-serif;font-size:14px;border:1px solid #e5e7eb;border-radius:12px;padding:20px;background:#fafafa}
      </style></head><body>
      <h1>${c.title}</h1>
      <div class="meta">${employee?.full_name ?? ""} · ${contractTypeLabel(c.type, "ar")} · ${c.startDate}</div>
      <pre>${c.body.replace(/</g, "&lt;")}</pre>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 text-start sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start gap-4 pe-6">
            {employee ? (
              <EmployeeAvatar name={employee.full_name} src={employee.avatarUrl} size="lg" rounded="2xl" />
            ) : (
              <span className="grid size-16 place-items-center rounded-2xl bg-brand text-brand-foreground">
                <FileText className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <DialogTitle className="font-display text-xl">{contract.title}</DialogTitle>
              <DialogDescription>
                {employee
                  ? `${employee.full_name} · ${employee.job_title} · ${employee.department}`
                  : contract.employeeId}
              </DialogDescription>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={contractStatusTone(contract.status)}>
                  {contractStatusLabel(contract.status, lang)}
                </StatusBadge>
                <StatusBadge tone="info">{contractTypeLabel(contract.type, lang)}</StatusBadge>
                <StatusBadge tone="neutral">{contract.salary.toLocaleString("en-GB")} JOD</StatusBadge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label={lang === "ar" ? "البداية" : "Start"} value={contract.startDate} />
            <Meta
              label={lang === "ar" ? "النهاية" : "End"}
              value={contract.endDate || (lang === "ar" ? "مفتوح" : "Open-ended")}
            />
            <Meta label={lang === "ar" ? "ساعات اليوم" : "Daily hours"} value={`${contract.workHours}h`} />
            <Meta
              label={lang === "ar" ? "إشعار الإنهاء" : "Notice"}
              value={`${contract.noticeDays} ${lang === "ar" ? "يوم" : "days"}`}
            />
          </div>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{lang === "ar" ? "نص العقد الكامل" : "Full contract"}</h3>
              <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={printContract}>
                <Printer className="size-3.5" />
                {lang === "ar" ? "طباعة" : "Print"}
              </Button>
            </div>
            <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-4 text-xs leading-7 text-foreground md:text-sm">
              {contract.body}
            </pre>
          </section>

          {canManage ? (
            <div className="flex justify-end">
              <Button type="button" variant="destructive" className="rounded-xl" onClick={onDelete}>
                {lang === "ar" ? "حذف العقد" : "Delete contract"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateContractDialog({
  open,
  onOpenChange,
  employees,
  lang,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employees: StaffRecord[];
  lang: "ar" | "en";
  onCreate: (
    emp: StaffRecord,
    data: {
      type: ContractType;
      startDate: string;
      endDate: string;
      salary: number;
      status: ContractStatus;
      workHours: number;
      probationMonths: number;
      noticeDays: number;
      body?: string;
    },
  ) => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState<ContractType>("full_time");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [salary, setSalary] = useState("1500");
  const [status, setStatus] = useState<ContractStatus>("active");
  const [workHours, setWorkHours] = useState("8");
  const [probationMonths, setProbationMonths] = useState("3");
  const [noticeDays, setNoticeDays] = useState("30");
  const [customBody, setCustomBody] = useState("");

  const emp = employees.find((e) => e.id === employeeId) ?? employees[0];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emp) {
      toast.error(lang === "ar" ? "اختر موظفًا" : "Select an employee");
      return;
    }
    onCreate(emp, {
      type,
      startDate,
      endDate,
      salary: Number(salary) || emp.salary,
      status,
      workHours: Number(workHours) || 8,
      probationMonths: Number(probationMonths) || 0,
      noticeDays: Number(noticeDays) || 30,
      ...(customBody.trim() ? { body: customBody.trim() } : {}),
    });
  }

  function fillDemoBody() {
    if (!emp) return;
    setCustomBody(
      buildDemoContractBody(emp, {
        type,
        startDate,
        endDate,
        salary: Number(salary) || emp.salary,
        workHours: Number(workHours) || 8,
        probationMonths: Number(probationMonths) || 0,
        noticeDays: Number(noticeDays) || 30,
      }),
    );
  }

  const selectClass =
    "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,44rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 text-start sm:px-6 sm:py-5">
          <DialogTitle>{lang === "ar" ? "إنشاء عقد عمل" : "Create employment contract"}</DialogTitle>
          <DialogDescription>
            {lang === "ar"
              ? "اربط العقد بموظف واملأ البنود — أو ولّد نصًا تجريبيًا احترافيًا."
              : "Link the contract to an employee — or generate a professional demo body."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <Field label={lang === "ar" ? "الموظف" : "Employee"}>
            <select className={selectClass} value={emp?.id ?? ""} onChange={(e) => {
              setEmployeeId(e.target.value);
              const next = employees.find((x) => x.id === e.target.value);
              if (next) {
                setSalary(String(next.salary));
                setWorkHours(String(next.workHours || 8));
              }
            }}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} — {e.job_title}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "نوع العقد" : "Type"}>
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as ContractType)}>
                <option value="full_time">{contractTypeLabel("full_time", lang)}</option>
                <option value="part_time">{contractTypeLabel("part_time", lang)}</option>
                <option value="probation">{contractTypeLabel("probation", lang)}</option>
                <option value="consultant">{contractTypeLabel("consultant", lang)}</option>
              </select>
            </Field>
            <Field label={lang === "ar" ? "الحالة" : "Status"}>
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as ContractStatus)}>
                <option value="active">{contractStatusLabel("active", lang)}</option>
                <option value="renewal">{contractStatusLabel("renewal", lang)}</option>
                <option value="ended">{contractStatusLabel("ended", lang)}</option>
              </select>
            </Field>
            <Field label={lang === "ar" ? "تاريخ البداية" : "Start date"}>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" dir="ltr" required />
            </Field>
            <Field label={lang === "ar" ? "تاريخ النهاية (اختياري)" : "End date (optional)"}>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "الراتب (JOD)" : "Salary (JOD)"}>
              <Input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "ساعات العمل" : "Work hours"}>
              <Input type="number" min={1} value={workHours} onChange={(e) => setWorkHours(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "أشهر التجربة" : "Probation months"}>
              <Input type="number" min={0} value={probationMonths} onChange={(e) => setProbationMonths(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
            <Field label={lang === "ar" ? "أيام الإشعار" : "Notice days"}>
              <Input type="number" min={0} value={noticeDays} onChange={(e) => setNoticeDays(e.target.value)} className="rounded-xl" dir="ltr" />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">
              {lang === "ar" ? "نص العقد (اختياري — يُولَّد تلقائيًا إن تُرك فارغًا)" : "Contract body (optional)"}
            </Label>
            <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={fillDemoBody}>
              {lang === "ar" ? "توليد نص تجريبي" : "Generate demo text"}
            </Button>
          </div>
          <Textarea
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            className="min-h-40 rounded-xl font-mono text-xs"
            placeholder={lang === "ar" ? "اتركه فارغًا لتوليد عقد قياسي مرتبط بالموظف..." : "Leave empty to auto-generate..."}
          />
          <Button type="submit" className="w-full rounded-xl bg-brand text-brand-foreground">
            {lang === "ar" ? "حفظ العقد وربطه بالموظف" : "Save & link to employee"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}
