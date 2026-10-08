import { v7 } from "uuid";

/** ID dibuat di klien (UUID v7, terurut waktu) supaya data bisa dibuat offline. */
export const newId = (): string => v7();
