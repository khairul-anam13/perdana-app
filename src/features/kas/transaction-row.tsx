import { Badge } from "@/components/ui/badge";
import { IconCamera } from "@/components/ui/icons";
import { IkonKategori } from "./category-icon";
import { formatAngka, formatRupiah } from "@/lib/format/rupiah";
import type { Transaction } from "./schema";

export function TransactionRow({
  tx,
  reversed,
  pending,
  detail,
  saldo,
  onOpen,
}: {
  tx: Transaction;
  reversed: boolean;
  pending: boolean;
  detail?: string;
  /** saldo kas setelah transaksi ini, seperti kolom saldo di buku kas */
  saldo?: number;
  onOpen: () => void;
}) {
  const income = tx.type === "pemasukan";
  const voided = reversed || !!tx.reversesTransactionId;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-start gap-2.5 px-3 py-2.5 text-left -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
      >
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-[22%] ${
            income ? "bg-pulpen-100 text-pulpen-700" : "bg-merah-100 text-merah-700"
          }`}
        >
          <IkonKategori category={tx.category} className="size-[1.1rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-tight font-bold">{tx.category}</span>
          <span className="block truncate text-sm text-tinta-pudar">
            {detail || tx.note || "Tanpa keterangan"}
          </span>
          {(voided || pending || tx.receiptId) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {tx.reversesTransactionId && <Badge>Koreksi</Badge>}
              {reversed && <Badge>Sudah dikoreksi</Badge>}
              {pending && <span className="stabilo text-xs font-bold">Menunggu kirim</span>}
              {tx.receiptId && (
                <Badge tone="pulpen">
                  <IconCamera className="size-3" /> Nota
                </Badge>
              )}
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`block font-bold ${income ? "text-pulpen-600" : "text-merah-600"} ${voided ? "line-through" : ""}`}
          >
            {income ? "+" : "−"} {formatRupiah(tx.amount)}
          </span>
          {saldo !== undefined && (
            <span className="block text-xs text-tinta-pudar">Saldo {formatAngka(saldo)}</span>
          )}
        </span>
      </button>
    </li>
  );
}
