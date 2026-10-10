"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { usePerm } from "@/lib/auth/use-perm";
import { db } from "@/lib/db/local";
import { formatRupiah } from "@/lib/format/rupiah";
import { formatTanggalPanjang, formatWaktu } from "@/lib/format/tanggal";
import { useOnline } from "@/lib/sync/use-sync-info";
import { canReverse } from "./ledger";
import { reverseTransaction } from "./repository";
import { TX_LABEL, type Transaction } from "./schema";

function ReceiptImage({ id }: { id: string }) {
  const online = useOnline();
  const receipt = useLiveQuery(() => db.receipts.get(id), [id]);
  const blob = receipt?.blob;
  const localUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  if (localUrl)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob lokal, tidak bisa dioptimasi next/image
      <img
        src={localUrl}
        alt="Foto nota"
        className="max-h-80 w-full rounded-md border border-garis object-contain"
      />
    );
  if (receipt?.status === "terunggah" && online)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- gambar dari API pribadi
      <img
        src={`/api/receipts/${id}`}
        alt="Foto nota"
        className="max-h-80 w-full rounded-md border border-garis object-contain"
      />
    );
  return (
    <p className="rounded-md bg-garis/60 p-3 text-sm text-tinta-pudar">
      Foto nota tersimpan di server. Tampil saat HP online.
    </p>
  );
}

export function TransactionSheet({
  tx,
  reversed,
  pending,
  memberName,
  activityTitle,
  onClose,
}: {
  tx: Transaction | null;
  reversed: ReadonlySet<string>;
  pending: boolean;
  memberName?: string;
  activityTitle?: string;
  onClose: () => void;
}) {
  const { user, can } = usePerm();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const allowReverse = !!tx && can("transaction") && canReverse(tx, reversed);

  async function doReverse() {
    if (!tx || !user) return;
    setBusy(true);
    const id = await reverseTransaction(tx, user);
    setBusy(false);
    setConfirming(false);
    onClose();
    if (id) toast.saved([id]);
    else toast.show("Transaksi ini sudah dikoreksi", "error");
  }

  return (
    <Sheet
      open={!!tx}
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      title={tx ? `${TX_LABEL[tx.type]}: ${tx.category}` : ""}
    >
      {tx && (
        <div className="flex flex-col gap-4">
          <p
            className={`text-3xl font-bold ${tx.type === "pemasukan" ? "text-pulpen-600" : "text-merah-700"}`}
          >
            {tx.type === "pemasukan" ? "+" : "−"} {formatRupiah(tx.amount)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tx.reversesTransactionId && <Badge>Transaksi koreksi</Badge>}
            {reversed.has(tx.id) && <Badge tone="stabilo">Sudah dikoreksi</Badge>}
            {pending && <Badge tone="stabilo">Menunggu dikirim</Badge>}
          </div>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5 text-sm">
            <dt className="text-tinta-pudar">Tanggal</dt>
            <dd className="font-medium">{formatTanggalPanjang(tx.transactionDate)}</dd>
            {tx.note && (
              <>
                <dt className="text-tinta-pudar">Keterangan</dt>
                <dd className="font-medium">{tx.note}</dd>
              </>
            )}
            {memberName && (
              <>
                <dt className="text-tinta-pudar">Anggota</dt>
                <dd className="font-medium">{memberName}</dd>
              </>
            )}
            {activityTitle && (
              <>
                <dt className="text-tinta-pudar">Kegiatan</dt>
                <dd className="font-medium">{activityTitle}</dd>
              </>
            )}
            <dt className="text-tinta-pudar">Dicatat</dt>
            <dd className="font-medium">{formatWaktu(tx.createdAt)}</dd>
          </dl>

          {tx.receiptId && <ReceiptImage id={tx.receiptId} />}

          {allowReverse &&
            (confirming ? (
              <div className="rounded-lg bg-stabilo-100 p-4 ring-1 ring-stabilo-300">
                <p className="font-bold">Buat transaksi koreksi?</p>
                <p className="mt-1 text-sm text-tinta-pudar">
                  Transaksi ini tidak diubah atau dihapus. Sebuah transaksi pembalik sebesar{" "}
                  {formatRupiah(tx.amount)} akan ditambahkan supaya saldo kembali benar.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                    Batal
                  </Button>
                  <Button variant="danger" onClick={doReverse} disabled={busy}>
                    Ya, koreksi
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" block onClick={() => setConfirming(true)}>
                Koreksi transaksi ini
              </Button>
            ))}
        </div>
      )}
    </Sheet>
  );
}
