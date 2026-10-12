"use client";

import { useCallback } from "react";
import { usePref, writePref } from "./prefs";
import { TEMA, TEMA_KEY, terapkanTema, type Tema } from "./tema";

/** Tema aktif dan pengubahnya. Memasang atribut data-tema pada <html> seketika. */
export function useTema(): [Tema, (t: Tema) => void] {
  const raw = usePref(TEMA_KEY, "folio");
  const tema: Tema = (TEMA as readonly string[]).includes(raw) ? (raw as Tema) : "folio";
  const set = useCallback((t: Tema) => {
    terapkanTema(t);
    writePref(TEMA_KEY, t);
  }, []);
  return [tema, set];
}
