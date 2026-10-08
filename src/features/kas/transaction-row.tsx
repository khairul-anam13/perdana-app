import { Badge } from "@/components/ui/badge";
import { IconArrowDown, IconArrowUp, IconCamera, IconSync } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format/rupiah";
import type { Transaction } from "./schema";

export function TransactionRow({
  tx,
  reversed,
  pending,
  detail,
  onOpen,
}: {
  tx: Transaction;
  reversed: boolean;
  pending: boolean;
  detail?: string;
  onOpen: () => void;
}) {
  const income = tx.type === "pemasukan";
  const Icon = income ? IconArrowDown : IconArrowUp;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-daun-50/70 active:bg-daun-50"
      >
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${income ? "bg-daun-100 text-daun-700" : "bg-bata-100 text-bata-700"}`}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{tx.category}</span>
          <span className="block truncate text-sm text-tinta-lembut">
            {detail || tx.note || "Tanpa keterangan"}
          </span>
          {(tx.reversesTransactionId || reversed || pending || tx.receiptId) && (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {tx.reversesTransactionId && <Badge>Koreksi</Badge>}
              {reversed && <Badge tone="padi">Sudah dikoreksi</Badge>}
              {pending && (
                <Badge tone="padi">
                  <IconSync className="size-3" /> Menunggu kirim
                </Badge>
              )}
              {tx.receiptId && (
                <Badge tone="air">
                  <IconCamera className="size-3" /> Nota
                </Badge>
              )}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-right font-bold tabular-nums ${income ? "text-daun-700" : "text-bata-700"} ${reversed || tx.reversesTransactionId ? "opacity-60" : ""}`}
        >
          {income ? "+" : "−"} {formatRupiah(tx.amount)}
        </span>
      </button>
    </li>
  );
}
