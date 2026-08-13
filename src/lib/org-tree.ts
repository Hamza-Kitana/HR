import type { OrgDepartment, OrgPosition } from "./org-structure";
import type { StaffRecord } from "./staff";

export type OrgTreePerson = {
  id: string;
  fullName: string;
  avatarUrl: string;
  isActive: boolean;
};

export type OrgTreeNode = {
  position: OrgPosition;
  departmentName: string;
  people: OrgTreePerson[];
  children: OrgTreeNode[];
};

/** Normalize Arabic/English titles for soft matching staff ↔ position. */
function normalizeTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/أ|إ|آ/g, "ا");
}

/** Chain from root → … → this position (names). */
export function positionAncestorChain(
  positions: OrgPosition[],
  positionId: string | null | undefined,
): OrgPosition[] {
  if (!positionId) return [];
  const byId = Object.fromEntries(positions.map((p) => [p.id, p]));
  const chain: OrgPosition[] = [];
  let cur: OrgPosition | undefined = byId[positionId];
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentPositionId ? byId[cur.parentPositionId] : undefined;
  }
  return chain;
}

export function positionReportsLabel(
  positions: OrgPosition[],
  positionId: string | null | undefined,
  lang: "ar" | "en",
): string {
  const chain = positionAncestorChain(positions, positionId);
  if (chain.length <= 1) {
    return lang === "ar" ? "أعلى الهرم" : "Top of hierarchy";
  }
  // parent only (immediate boss role)
  const parent = chain[chain.length - 2]!;
  return parent.name;
}

/** Resolve staff → position id (explicit id, else title+department match). */
export function resolveStaffPositionId(
  person: Pick<StaffRecord, "positionId" | "job_title" | "department" | "username">,
  positions: OrgPosition[],
  departments: OrgDepartment[],
): string | null {
  if (person.positionId && positions.some((p) => p.id === person.positionId)) {
    return person.positionId;
  }
  const dept = departments.find((d) => d.name === person.department);
  const titleKey = normalizeTitle(person.job_title);
  if (!titleKey) return null;
  const match = positions.find((p) => {
    if (normalizeTitle(p.name) !== titleKey) return false;
    if (!dept) return true;
    return p.departmentId === dept.id;
  });
  return match?.id ?? null;
}

export function staffForPosition(
  position: OrgPosition,
  departmentName: string,
  staff: StaffRecord[],
  departments: OrgDepartment[],
  positions: OrgPosition[],
): OrgTreePerson[] {
  return staff
    .filter((s) => s.username !== "sadmin")
    .filter((s) => resolveStaffPositionId(s, positions, departments) === position.id)
    .map((s) => ({
      id: s.id,
      fullName: s.full_name,
      avatarUrl: s.avatarUrl,
      isActive: s.is_active,
    }));
}

/** Staff who are not placed on any org position (won't appear in hierarchy). */
export function unassignedStaff(
  staff: StaffRecord[],
  positions: OrgPosition[],
  departments: OrgDepartment[],
): StaffRecord[] {
  return staff.filter(
    (s) =>
      s.username !== "sadmin" &&
      s.is_active &&
      !resolveStaffPositionId(s, positions, departments),
  );
}

/** Prevent cycles: cannot parent under self or any descendant. */
export function isInvalidParent(
  positions: OrgPosition[],
  positionId: string,
  candidateParentId: string | null,
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === positionId) return true;
  const childrenOf = (id: string): string[] =>
    positions.filter((p) => p.parentPositionId === id).map((p) => p.id);
  const stack = [...childrenOf(positionId)];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === candidateParentId) return true;
    stack.push(...childrenOf(cur));
  }
  return false;
}

/** Positions in a department, ordered root→leaf for selects. */
export function orderedDepartmentPositions(
  positions: OrgPosition[],
  departmentId: string,
): OrgPosition[] {
  const mine = positions.filter((p) => p.departmentId === departmentId);
  const ids = new Set(mine.map((p) => p.id));
  const depth = (p: OrgPosition): number => {
    let d = 0;
    let cur: OrgPosition | undefined = p;
    const guard = new Set<string>();
    while (cur?.parentPositionId && ids.has(cur.parentPositionId) && !guard.has(cur.id)) {
      guard.add(cur.id);
      d += 1;
      cur = mine.find((x) => x.id === cur!.parentPositionId);
    }
    // also count parents outside dept
    cur = p;
    guard.clear();
    let outside = 0;
    while (cur?.parentPositionId && !guard.has(cur.id)) {
      guard.add(cur.id);
      const parent = positions.find((x) => x.id === cur!.parentPositionId);
      if (!parent) break;
      if (!ids.has(parent.id)) outside += 1;
      cur = parent;
      if (ids.has(parent.id)) break;
    }
    return outside * 10 + d;
  };
  return [...mine].sort((a, b) => {
    const dd = depth(a) - depth(b);
    return dd !== 0 ? dd : a.name.localeCompare(b.name, "ar");
  });
}

export function buildOrgTree(
  positions: OrgPosition[],
  departments: OrgDepartment[],
  staff: StaffRecord[],
): OrgTreeNode[] {
  const deptName = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const byParent = new Map<string | null, OrgPosition[]>();

  for (const p of positions) {
    const key =
      p.parentPositionId && positions.some((x) => x.id === p.parentPositionId)
        ? p.parentPositionId
        : null;
    const list = byParent.get(key) ?? [];
    list.push(p);
    byParent.set(key, list);
  }

  const sortPositions = (list: OrgPosition[]) =>
    [...list].sort((a, b) => {
      const score = (p: OrgPosition) => {
        const n = normalizeTitle(p.name);
        if (n.includes("المدير التنفيذي") || n.includes("ceo")) return 0;
        if (n.includes("مدير") || n.includes("مديرة") || n.includes("مسؤول قسم")) return 1;
        if (n.includes("تيم ليد") || n.includes("team lead")) return 2;
        return 3;
      };
      const d = score(a) - score(b);
      return d !== 0 ? d : a.name.localeCompare(b.name, "ar");
    });

  function build(parentId: string | null): OrgTreeNode[] {
    return sortPositions(byParent.get(parentId) ?? []).map((position) => {
      const departmentName = deptName[position.departmentId] ?? "";
      return {
        position,
        departmentName,
        people: staffForPosition(position, departmentName, staff, departments, positions),
        children: build(position.id),
      };
    });
  }

  return build(null);
}

export function countTreeNodes(nodes: OrgTreeNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countTreeNodes(node.children), 0);
}

export function countPeopleInTree(nodes: OrgTreeNode[]): number {
  return nodes.reduce(
    (n, node) => n + node.people.filter((p) => p.isActive).length + countPeopleInTree(node.children),
    0,
  );
}
