import { createFileRoute } from "@tanstack/react-router";
import { Building2, ImagePlus, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell, DataTable, PageHeader, StatCard, StatusBadge } from "@/components/app/app-shell";
import { fileToAvatarDataUrl } from "@/components/app/employee-avatar";
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
import { useAuth } from "@/lib/auth";
import {
  branchStatusLabel,
  useBranches,
  type Branch,
  type BranchStatus,
} from "@/lib/branches";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/branches")({
  ssr: false,
  head: () => ({ meta: [{ title: "الفروع | توقيعي" }, { name: "robots", content: "noindex" }] }),
  component: BranchesPage,
});

function BranchesPage() {
  const { t, lang } = useI18n();
  const { can, isSuperAdmin } = useAuth();
  const { branches, addBranch, updateBranch, deleteBranch } = useBranches();
  const canManage = isSuperAdmin || can("hr.employees.edit") || can("roles.manage");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const active = branches.filter((b) => b.status === "active").length;
  const planned = branches.filter((b) => b.status === "planned").length;
  const staffTotal = branches.reduce((s, b) => s + b.employees, 0);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setDialogOpen(true);
  }

  return (
    <AppShell title="nav.branches">
      <PageHeader
        title="nav.branches"
        description={
          lang === "ar"
            ? "إدارة فروع الشركة: إضافة، تعديل، حذف، صورة، وهاتف وفاكس وإيميل."
            : "Manage company branches: add, edit, delete, photo, phone, fax and email."
        }
        action={
          canManage ? (
            <Button type="button" className="rounded-xl bg-brand text-brand-foreground shadow-glow" onClick={openCreate}>
              <Plus className="size-4" />
              {lang === "ar" ? "فرع جديد" : "New branch"}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={lang === "ar" ? "فروع نشطة" : "Active"} value={active} />
        <StatCard label={lang === "ar" ? "مخططة" : "Planned"} value={planned} />
        <StatCard label={lang === "ar" ? "إجمالي الموظفين" : "Total staff"} value={staffTotal} />
        <StatCard label={lang === "ar" ? "المواقع" : "Locations"} value={branches.length} />
      </div>

      <DataTable
        headers={[
          lang === "ar" ? "الفرع" : "Branch",
          lang === "ar" ? "المدينة" : "City",
          lang === "ar" ? "التواصل" : "Contact",
          lang === "ar" ? "المدير" : "Manager",
          lang === "ar" ? "الموظفون" : "Staff",
          t("common.status"),
          ...(canManage ? [t("common.actions")] : []),
        ]}
        rows={branches.map((b) => [
          <div key={`${b.id}-n`} className="flex items-center gap-3">
            <BranchThumb name={b.name} src={b.imageUrl} />
            <div className="min-w-0">
              <p className="font-semibold">{b.name}</p>
              {b.address ? <p className="truncate text-xs text-muted-foreground">{b.address}</p> : null}
            </div>
          </div>,
          b.city || "—",
          <div key={`${b.id}-c`} className="space-y-0.5 text-xs">
            {b.phone ? (
              <p className="flex items-center gap-1.5" dir="ltr">
                <Phone className="size-3 text-muted-foreground" />
                {b.phone}
              </p>
            ) : null}
            {b.fax ? (
              <p className="text-muted-foreground" dir="ltr">
                Fax: {b.fax}
              </p>
            ) : null}
            {b.email ? (
              <p className="flex items-center gap-1.5" dir="ltr">
                <Mail className="size-3 text-muted-foreground" />
                {b.email}
              </p>
            ) : null}
            {!b.phone && !b.fax && !b.email ? "—" : null}
          </div>,
          b.manager || "—",
          String(b.employees),
          <StatusBadge
            key={`${b.id}-s`}
            tone={b.status === "active" ? "success" : b.status === "planned" ? "warning" : "neutral"}
          >
            {branchStatusLabel(b.status, lang)}
          </StatusBadge>,
          ...(canManage
            ? [
                <div key={`${b.id}-a`} className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => openEdit(b)}>
                    <Pencil className="size-3.5" />
                    {lang === "ar" ? "تعديل" : "Edit"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="rounded-lg"
                    onClick={() => {
                      if (
                        !window.confirm(
                          lang === "ar" ? `حذف فرع «${b.name}»؟` : `Delete branch «${b.name}»?`,
                        )
                      ) {
                        return;
                      }
                      deleteBranch(b.id);
                      toast.success(lang === "ar" ? "تم حذف الفرع" : "Branch deleted");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    {lang === "ar" ? "حذف" : "Delete"}
                  </Button>
                </div>,
              ]
            : []),
        ])}
      />

      <BranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branch={editing}
        lang={lang}
        onSubmit={(data) => {
          if (editing) {
            updateBranch(editing.id, data);
            toast.success(lang === "ar" ? "تم تحديث الفرع" : "Branch updated");
          } else {
            const result = addBranch(data);
            if ("error" in result) {
              toast.error(lang === "ar" ? "اسم الفرع مطلوب" : "Branch name is required");
              return;
            }
            toast.success(lang === "ar" ? "تمت إضافة الفرع" : "Branch added");
          }
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </AppShell>
  );
}

function BranchThumb({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
      <Building2 className="size-5" />
    </span>
  );
}

function BranchDialog({
  open,
  onOpenChange,
  branch,
  lang,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch: Branch | null;
  lang: "ar" | "en";
  onSubmit: (data: {
    name: string;
    city: string;
    address: string;
    manager: string;
    phone: string;
    fax: string;
    email: string;
    imageUrl: string;
    employees: number;
    status: BranchStatus;
  }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [employees, setEmployees] = useState("0");
  const [status, setStatus] = useState<BranchStatus>("active");

  useEffect(() => {
    if (!open) return;
    setName(branch?.name ?? "");
    setCity(branch?.city ?? "");
    setAddress(branch?.address ?? "");
    setManager(branch?.manager ?? "");
    setPhone(branch?.phone ?? "");
    setFax(branch?.fax ?? "");
    setEmail(branch?.email ?? "");
    setImageUrl(branch?.imageUrl ?? "");
    setEmployees(String(branch?.employees ?? 0));
    setStatus(branch?.status ?? "active");
  }, [open, branch]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file, 640, 0.84);
      setImageUrl(dataUrl);
      toast.success(lang === "ar" ? "تم رفع الصورة" : "Image uploaded");
    } catch {
      toast.error(lang === "ar" ? "تعذر رفع الصورة" : "Could not upload image");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      city,
      address,
      manager,
      phone,
      fax,
      email,
      imageUrl,
      employees: Number(employees) || 0,
      status,
    });
  }

  const selectClass =
    "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,36rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 text-start sm:px-6 sm:py-5">
          <DialogTitle>
            {branch
              ? lang === "ar"
                ? "تعديل الفرع"
                : "Edit branch"
              : lang === "ar"
                ? "فرع جديد"
                : "New branch"}
          </DialogTitle>
          <DialogDescription>
            {lang === "ar"
              ? "أدخل بيانات الفرع مع صورة ووسائل التواصل."
              : "Enter branch details with photo and contact info."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-20 rounded-2xl object-cover ring-1 ring-border transition group-hover:opacity-90"
                />
              ) : (
                <span className="grid size-20 place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 text-muted-foreground transition group-hover:bg-secondary">
                  <ImagePlus className="size-6" />
                </span>
              )}
            </button>
            <div className="space-y-2">
              <p className="text-sm font-semibold">{lang === "ar" ? "صورة الفرع" : "Branch photo"}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="size-3.5" />
                  {lang === "ar" ? "رفع صورة" : "Upload"}
                </Button>
                {imageUrl ? (
                  <Button type="button" size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => setImageUrl("")}>
                    {lang === "ar" ? "إزالة" : "Remove"}
                  </Button>
                ) : null}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
            </div>
          </div>

          <Field label={lang === "ar" ? "اسم الفرع *" : "Branch name *"}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "المدينة" : "City"}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "الحالة" : "Status"}>
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as BranchStatus)}>
                <option value="active">{lang === "ar" ? "نشط" : "Active"}</option>
                <option value="planned">{lang === "ar" ? "مخطط" : "Planned"}</option>
                <option value="closed">{lang === "ar" ? "مغلق" : "Closed"}</option>
              </select>
            </Field>
          </div>

          <Field label={lang === "ar" ? "العنوان" : "Address"}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "المدير" : "Manager"}>
              <Input value={manager} onChange={(e) => setManager(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label={lang === "ar" ? "عدد الموظفين" : "Employees"}>
              <Input
                type="number"
                min={0}
                value={employees}
                onChange={(e) => setEmployees(e.target.value)}
                className="rounded-xl"
                dir="ltr"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={lang === "ar" ? "هاتف" : "Phone"}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" dir="ltr" placeholder="+962 6 ..." />
            </Field>
            <Field label={lang === "ar" ? "فاكس" : "Fax"}>
              <Input value={fax} onChange={(e) => setFax(e.target.value)} className="rounded-xl" dir="ltr" placeholder="+962 6 ..." />
            </Field>
          </div>

          <Field label={lang === "ar" ? "إيميل" : "Email"}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl"
              dir="ltr"
              placeholder="branch@tawqi3i.jo"
            />
          </Field>

          <Button type="submit" className={cn("w-full rounded-xl bg-brand text-brand-foreground")}>
            {branch ? (lang === "ar" ? "حفظ التعديلات" : "Save changes") : lang === "ar" ? "إضافة الفرع" : "Add branch"}
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
