import { useCallback, useEffect, useState } from "react";

import { logActivity } from "./activity-log";
import { MOCK_BRANCHES } from "./erp-modules";

export type BranchStatus = "active" | "planned" | "closed";

export type Branch = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "tawqi3i.branches.v1";
const EVENT_NAME = "tawqi3i-branches";

function uid() {
  return `br-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function normalizeBranch(raw: Partial<Branch> & { id?: string }): Branch {
  const status: BranchStatus =
    raw.status === "planned" || raw.status === "closed" || raw.status === "active"
      ? raw.status
      : "active";
  return {
    id: raw.id ?? uid(),
    name: (raw.name ?? "").trim(),
    city: (raw.city ?? "").trim(),
    address: (raw.address ?? "").trim(),
    manager: (raw.manager ?? "").trim(),
    phone: (raw.phone ?? "").trim(),
    fax: (raw.fax ?? "").trim(),
    email: (raw.email ?? "").trim(),
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : "",
    employees: typeof raw.employees === "number" && raw.employees >= 0 ? raw.employees : 0,
    status,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  };
}

function seedBranches(): Branch[] {
  return MOCK_BRANCHES.map((b) =>
    normalizeBranch({
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.city === "عمّان" ? "عبدون، عمّان" : b.city,
      manager: b.manager === "—" ? "" : b.manager,
      phone:
        b.city === "عمّان"
          ? "+962 6 555 1000"
          : b.city === "إربد"
            ? "+962 2 555 2000"
            : "+962 3 555 3000",
      fax:
        b.city === "عمّان"
          ? "+962 6 555 1001"
          : b.city === "إربد"
            ? "+962 2 555 2001"
            : "",
      email:
        b.city === "عمّان"
          ? "abdoon@tawqi3i.jo"
          : b.city === "إربد"
            ? "irbid@tawqi3i.jo"
            : "aqaba@tawqi3i.jo",
      imageUrl: "",
      employees: b.employees,
      status: b.status,
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    }),
  );
}

function readStore(): Branch[] {
  if (typeof window === "undefined") return seedBranches();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedBranches();
    const parsed = JSON.parse(raw) as Partial<Branch>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seedBranches();
    return parsed.map((b) => normalizeBranch(b));
  } catch {
    return seedBranches();
  }
}

function persist(branches: Branch[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function branchStatusLabel(status: BranchStatus, lang: "ar" | "en") {
  if (status === "active") return lang === "ar" ? "نشط" : "Active";
  if (status === "planned") return lang === "ar" ? "مخطط" : "Planned";
  return lang === "ar" ? "مغلق" : "Closed";
}

export type BranchInput = {
  name: string;
  city: string;
  address?: string;
  manager?: string;
  phone?: string;
  fax?: string;
  email?: string;
  imageUrl?: string;
  employees?: number;
  status?: BranchStatus;
};

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBranches(readStore());
    setHydrated(true);
    const refresh = () => setBranches(readStore());
    window.addEventListener(EVENT_NAME, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT_NAME, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (branches.length === 0) {
      const existing = readStore();
      if (existing.length > 0) return;
    }
    persist(branches);
  }, [branches, hydrated]);

  const addBranch = useCallback((input: BranchInput) => {
    const name = input.name.trim();
    if (!name) return { error: "name" as const };
    const next = normalizeBranch({
      id: uid(),
      name,
      city: input.city?.trim() || "",
      address: input.address?.trim() || "",
      manager: input.manager?.trim() || "",
      phone: input.phone?.trim() || "",
      fax: input.fax?.trim() || "",
      email: input.email?.trim() || "",
      imageUrl: input.imageUrl?.trim() || "",
      employees: input.employees ?? 0,
      status: input.status ?? "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    setBranches((prev) => [next, ...prev]);
    logActivity({
      module: "org",
      action: "إضافة فرع",
      actionEn: "Branch created",
      entity: "فروع",
      entityEn: "Branches",
      details: next.name,
      detailsEn: next.name,
    });
    return { branch: next };
  }, []);

  const updateBranch = useCallback((id: string, patch: Partial<BranchInput>) => {
    let name = id;
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const next = normalizeBranch({
          ...b,
          ...patch,
          name: patch.name !== undefined ? patch.name.trim() : b.name,
          city: patch.city !== undefined ? patch.city.trim() : b.city,
          address: patch.address !== undefined ? patch.address.trim() : b.address,
          manager: patch.manager !== undefined ? patch.manager.trim() : b.manager,
          phone: patch.phone !== undefined ? patch.phone.trim() : b.phone,
          fax: patch.fax !== undefined ? patch.fax.trim() : b.fax,
          email: patch.email !== undefined ? patch.email.trim() : b.email,
          imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : b.imageUrl,
          updatedAt: nowIso(),
        });
        name = next.name;
        return next;
      }),
    );
    logActivity({
      module: "org",
      action: "تعديل فرع",
      actionEn: "Branch updated",
      entity: "فروع",
      entityEn: "Branches",
      details: name,
      detailsEn: name,
    });
  }, []);

  const deleteBranch = useCallback((id: string) => {
    let name = id;
    setBranches((prev) => {
      const target = prev.find((b) => b.id === id);
      if (target) name = target.name;
      return prev.filter((b) => b.id !== id);
    });
    logActivity({
      module: "org",
      action: "حذف فرع",
      actionEn: "Branch deleted",
      entity: "فروع",
      entityEn: "Branches",
      details: name,
      detailsEn: name,
    });
  }, []);

  return {
    branches,
    hydrated,
    addBranch,
    updateBranch,
    deleteBranch,
  };
}
