"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { canManageUsers, ROLE_LABEL, ROLES, type Role } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { useOnline } from "@/lib/sync/use-sync-info";
import { useLookups } from "@/features/use-lookups";

type UserRow = {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  memberId: string | null;
  memberName: string | null;
};

async function call(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok
      ? { ok: true, data }
      : { ok: false, error: (data as { error?: string }).error ?? "Gagal. Coba lagi." };
  } catch {
    return { ok: false, error: "Tidak bisa terhubung ke server" };
  }
}

export default function PenggunaPage() {
  const { user } = usePerm();
  const online = useOnline();
  const toast = useToast();
  const { members } = useLookups();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [pinFor, setPinFor] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    const r = await call("/api/users", "GET");
    if (r.ok) {
      setUsers((r.data as { users: UserRow[] }).users);
      setError(null);
    } else setError(r.error ?? "Gagal memuat");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- memuat data dari server saat halaman dibuka
    if (online) void load();
  }, [online, load]);

  async function patch(u: UserRow, body: object, okText: string) {
    const r = await call(`/api/users/${u.id}`, "PATCH", body);
    if (r.ok) {
      toast.show(okText);
      void load();
    } else toast.show(r.error ?? "Gagal", "error");
  }

  if (!user || !canManageUsers(user.role))
    return (
      <>
        <PageHeader title="Kelola pengguna" back={{ href: "/akun", label: "Akun" }} />
        <EmptyState title="Hanya Ketua yang bisa mengelola pengguna" />
      </>
    );

  const free = members.filter(
    (m) => !users?.some((u) => u.memberId === m.id) && m.status === "aktif",
  );

  return (
    <>
      <PageHeader
        title="Kelola pengguna"
        subtitle="Akun yang bisa masuk ke aplikasi."
        back={{ href: "/akun", label: "Akun" }}
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={!online}>
            <IconPlus className="size-5" /> Tambah
          </Button>
        }
      />

      {!online ? (
        <EmptyState
          title="Butuh internet"
          hint="Mengelola akun hanya bisa saat online, supaya PIN tersimpan aman di server."
        />
      ) : error ? (
        <p role="alert" className="rounded-lg bg-merah-50 p-4 font-medium text-merah-700">
          {error}
        </p>
      ) : users === null ? (
        <p className="py-10 text-center text-tinta-pudar">Memuat…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((u) => {
            const self = u.id === user.id;
            return (
              <li key={u.id} className="lembar p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{u.memberName ?? u.username}</p>
                    <p className="truncate text-sm text-tinta-pudar">@{u.username}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {self && <Badge tone="pulpen">Anda</Badge>}
                    {!u.active && <Badge tone="merah">Nonaktif</Badge>}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Select
                    aria-label={`Peran ${u.username}`}
                    value={u.role}
                    disabled={self}
                    onChange={(e) => patch(u, { role: e.target.value }, "Peran diubah")}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                  <Button variant="secondary" onClick={() => setPinFor(u)}>
                    Atur ulang PIN
                  </Button>
                  <Button
                    variant={u.active ? "ghost" : "secondary"}
                    disabled={self}
                    className={u.active ? "text-merah-700" : ""}
                    onClick={() =>
                      patch(
                        u,
                        { active: !u.active },
                        u.active ? "Akun dinonaktifkan" : "Akun diaktifkan",
                      )
                    }
                  >
                    {u.active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddUserSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        members={free}
        onDone={() => void load()}
      />
      <PinSheet user={pinFor} onClose={() => setPinFor(null)} />
    </>
  );
}

function AddUserSheet({
  open,
  onClose,
  members,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  members: { id: string; fullName: string }[];
  onDone: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Tambah akun">
      {open && <AddUserForm members={members} onClose={onClose} onDone={onDone} />}
    </Sheet>
  );
}

function AddUserForm({
  members,
  onClose,
  onDone,
}: {
  members: { id: string; fullName: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [memberId, setMemberId] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<Role>("anggota");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await call("/api/users", "POST", { username, pin, role, memberId: memberId || null });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Gagal");
    toast.show("Akun dibuat");
    onDone();
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Anggota pemilik akun" hint="Hubungkan ke data anggota agar bisa absen sendiri.">
        {(p) => (
          <Select {...p} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Tidak dihubungkan</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Username" hint="Huruf kecil, angka, titik, atau strip.">
        {(p) => (
          <Input
            {...p}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
          />
        )}
      </Field>
      <Field label="PIN awal (6 angka)">
        {(p) => (
          <Input
            {...p}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            className="tracking-[0.3em]"
          />
        )}
      </Field>
      <Field label="Peran">
        {(p) => (
          <Select {...p} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {error && (
        <p role="alert" className="rounded-md bg-merah-50 p-3 text-sm font-medium text-merah-700">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" block disabled={busy}>
        {busy ? "Menyimpan…" : "Buat akun"}
      </Button>
    </form>
  );
}

function PinSheet({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const toast = useToast();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const r = await call(`/api/users/${user.id}`, "PATCH", { pin });
    if (!r.ok) return setError(r.error ?? "Gagal");
    toast.show("PIN diubah");
    setPin("");
    setError(null);
    onClose();
  }

  return (
    <Sheet open={!!user} onClose={onClose} title={user ? `PIN baru untuk @${user.username}` : ""}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="PIN baru (6 angka)" error={error ?? undefined}>
          {(p) => (
            <Input
              {...p}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              className="tracking-[0.3em]"
            />
          )}
        </Field>
        <Button type="submit" size="lg" block disabled={pin.length !== 6}>
          Simpan PIN
        </Button>
      </form>
    </Sheet>
  );
}
