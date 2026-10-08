"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { listMembers } from "./anggota/repository";
import { listActivities } from "./kegiatan/repository";
import type { Activity } from "./kegiatan/schema";
import type { Member } from "./anggota/schema";

const NO_MEMBERS: Member[] = [];
const NO_ACTIVITIES: Activity[] = [];

/** Anggota & kegiatan dari data lokal, plus peta id -> nama untuk menampilkan relasi. */
export function useLookups() {
  const m = useLiveQuery(listMembers, []);
  const a = useLiveQuery(listActivities, []);
  const members = m ?? NO_MEMBERS;
  const activities = a ?? NO_ACTIVITIES;
  return useMemo(
    () => ({
      loading: m === undefined || a === undefined,
      members,
      activities,
      memberName: new Map(members.map((x) => [x.id, x.nickname || x.fullName])),
      memberFullName: new Map(members.map((x) => [x.id, x.fullName])),
      activityTitle: new Map(activities.map((x) => [x.id, x.title])),
    }),
    [m, a, members, activities],
  );
}
