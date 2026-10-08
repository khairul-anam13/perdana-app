import type { ComponentType } from "react";
import type { ModuleKey } from "@/lib/modules";
import { IconCalendar, IconHome, IconUser, IconUsers, IconWallet, type IconProps } from "./icons";

/** Ikon tiap modul: dipakai navigasi dan judul halaman supaya konsisten. */
export const MODULE_ICON: Record<ModuleKey, ComponentType<IconProps>> = {
  beranda: IconHome,
  kas: IconWallet,
  anggota: IconUsers,
  kegiatan: IconCalendar,
  akun: IconUser,
};
