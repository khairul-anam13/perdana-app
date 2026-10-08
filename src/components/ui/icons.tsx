import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowDown,
  faArrowUp,
  faCalendarCheck,
  faCamera,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faDownload,
  faEnvelope,
  faEye,
  faEyeSlash,
  faFileLines,
  faHandHoldingDollar,
  faHouse,
  faLocationDot,
  faMagnifyingGlass,
  faPlugCircleXmark,
  faPlus,
  faRightFromBracket,
  faRotate,
  faRotateLeft,
  faShareNodes,
  faTriangleExclamation,
  faUser,
  faUserGroup,
  faWallet,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faAndroid, faApple, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon, type FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

/**
 * Satu-satunya tempat ikon Font Awesome didaftarkan. Komponen lain mengimpor `IconXxx` dari sini,
 * jadi mengganti ikon atau gaya (mis. ke Duotone setelah memakai Kit Pro) cukup mengubah berkas ini.
 *
 * Gaya: Free Solid untuk antarmuka, Brands untuk logo (WhatsApp, Android, Apple).
 * Ukuran: beri `className="size-N"`; tanpa itu ikon 24px. Ikon dekoratif (aria-hidden) secara bawaan.
 */
export type IconProps = Omit<FontAwesomeIconProps, "icon">;

// CSS Font Awesome dimuat lewat globals.css (di layer `components`, supaya kelas ukuran Tailwind menang),
// jadi FA tidak perlu menyuntikkan CSS sendiri.
config.autoAddCss = false;

function make(icon: IconDefinition) {
  return function Icon({ className = "size-6", ...props }: IconProps) {
    // shrink-0: di dalam flex (tombol, baris) ikon tidak boleh ikut mengecil saat teks panjang.
    return <FontAwesomeIcon icon={icon} className={`shrink-0 ${className}`} {...props} />;
  };
}

// Navigasi / modul
export const IconHome = make(faHouse);
export const IconWallet = make(faWallet);
export const IconUsers = make(faUserGroup);
export const IconCalendar = make(faCalendarCheck);
export const IconUser = make(faUser);

// Aksi
export const IconPlus = make(faPlus);
export const IconCheck = make(faCheck);
export const IconX = make(faXmark);
export const IconChevronRight = make(faChevronRight);
export const IconChevronLeft = make(faChevronLeft);
export const IconArrowDown = make(faArrowDown);
export const IconArrowUp = make(faArrowUp);
export const IconUndo = make(faRotateLeft);
export const IconCamera = make(faCamera);
export const IconShare = make(faShareNodes);
export const IconSearch = make(faMagnifyingGlass);
export const IconDownload = make(faDownload);
export const IconLogout = make(faRightFromBracket);
export const IconEye = make(faEye);
export const IconEyeOff = make(faEyeSlash);

// Status
export const IconSync = make(faRotate);
export const IconOffline = make(faPlugCircleXmark);
export const IconWarning = make(faTriangleExclamation);
export const IconMapPin = make(faLocationDot);

// Konten
export const IconReport = make(faFileLines);
export const IconDues = make(faHandHoldingDollar);
export const IconEnvelope = make(faEnvelope);

// Merek (Brands)
export const IconWhatsapp = make(faWhatsapp);
export const IconAndroid = make(faAndroid);
export const IconApple = make(faApple);
