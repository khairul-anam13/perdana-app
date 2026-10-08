import { db } from "@/lib/db/local";
import type { SessionUser } from "@/lib/auth/session";
import { nowISO } from "@/lib/format/tanggal";
import { newId } from "@/lib/id";
import { writeAndEnqueue } from "@/lib/sync/outbox";
import type { Member, MemberForm } from "./schema";

/** Repository lokal anggota. UI hanya memanggil ini, tidak pernah langsung ke jaringan. */

export async function listMembers(): Promise<Member[]> {
  const rows = await db.members.filter((m) => !m.deletedAt).toArray();
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "id"));
}

export async function saveMember(
  form: MemberForm,
  user: SessionUser,
  existing?: Member,
): Promise<string> {
  const now = nowISO();
  const row: Member = existing
    ? { ...existing, ...form, updatedAt: now }
    : {
        id: newId(),
        organizationId: user.organizationId,
        ...form,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
  return writeAndEnqueue("member", existing ? "update" : "create", row);
}

/** Hapus = soft delete (deletedAt), supaya perangkat lain ikut menghapus lewat sinkronisasi. */
export async function deleteMember(member: Member): Promise<string> {
  const now = nowISO();
  return writeAndEnqueue("member", "delete", { ...member, deletedAt: now, updatedAt: now });
}
