import type { ComponentType } from "react";
import {
  IconBolt,
  IconBox,
  IconBuilding,
  IconCalendar,
  IconDues,
  IconEllipsis,
  IconGavel,
  IconHeart,
  IconTruck,
  IconUtensils,
  type IconProps,
} from "@/components/ui/icons";

/** Ikon per kategori kas: membantu mengenali jenis transaksi sekilas tanpa membaca. */
export const CATEGORY_ICON: Record<string, ComponentType<IconProps>> = {
  Iuran: IconDues,
  Listrik: IconBolt,
  Denda: IconGavel,
  Donasi: IconHeart,
  "Kas kegiatan": IconCalendar,
  Konsumsi: IconUtensils,
  Perlengkapan: IconBox,
  Transportasi: IconTruck,
  "Sewa tempat": IconBuilding,
  Lainnya: IconEllipsis,
};

/** Ikon kategori; kategori tak dikenal memakai tiga titik. */
export function IkonKategori({ category, ...props }: IconProps & { category: string }) {
  const Ikon = CATEGORY_ICON[category] ?? IconEllipsis;
  return <Ikon {...props} />;
}
