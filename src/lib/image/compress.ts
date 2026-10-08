const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", q));

/**
 * Kompres foto nota di sisi klien: perkecil sisi terpanjang (maks 1280px) lalu turunkan kualitas JPEG
 * sampai di bawah target (default 300 KB). Mengembalikan hasil terkecil bila target tidak tercapai.
 */
export async function compressImage(file: Blob, maxBytes = 300 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  let smallest: Blob | null = null;

  for (let round = 0; round < 6; round++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff"; // JPEG tidak punya transparansi
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.8, 0.65, 0.5, 0.4]) {
      const blob = await toBlob(canvas, quality);
      if (!blob) continue;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= maxBytes) {
        bitmap.close();
        return blob;
      }
    }
    scale *= 0.75;
  }
  bitmap.close();
  if (!smallest) throw new Error("Foto tidak bisa diproses");
  return smallest;
}
