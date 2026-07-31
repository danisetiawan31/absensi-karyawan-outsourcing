/**
 * Utilitas Terpusat Penanganan Tanggal & Timezone Asia/Jakarta (+07:00)
 * Memastikan presisi milidetik dan keabsahan batas waktu di seluruh domain.
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TZ_SUFFIX = '+07:00';

export interface DateRange {
  gte: Date;
  lt: Date;
}

/**
 * Mengembalikan Date objek untuk jam 00:00:00+07:00 dari string YYYY-MM-DD
 */
export function getJakartaStartOfDay(tanggal: string): Date {
  return new Date(`${tanggal}T00:00:00${TZ_SUFFIX}`);
}

/**
 * Menggabungkan tanggal (YYYY-MM-DD) dan jam (HH:mm atau HH:mm:ss) menjadi Date objek ber-offset +07:00
 */
export function combineJakartaDateTime(tanggal: string, jam: string): Date {
  const jamFormatted = jam.length === 5 ? `${jam}:00` : jam;
  return new Date(`${tanggal}T${jamFormatted}${TZ_SUFFIX}`);
}

/**
 * Mengembalikan rentang 1 hari penuh [gte, lt) dalam timezone Jakarta.
 * lt merujuk pada jam 00:00:00 hari berikutnya (pola eksklusif aman milidetik).
 */
export function getJakartaSingleDayRange(tanggal: string): DateRange {
  const gte = getJakartaStartOfDay(tanggal);
  const lt = new Date(gte.getTime() + ONE_DAY_MS);
  return { gte, lt };
}

/**
 * Mengembalikan rentang multi-hari [gte, lt) dari tanggalMulai s/d tanggalSelesai.
 * lt merujuk pada jam 00:00:00 hari setelah tanggalSelesai.
 */
export function getJakartaDateRange(
  tanggalMulai: string,
  tanggalSelesai: string,
): DateRange {
  const gte = getJakartaStartOfDay(tanggalMulai);
  const startOfSelesai = getJakartaStartOfDay(tanggalSelesai);
  const lt = new Date(startOfSelesai.getTime() + ONE_DAY_MS);
  return { gte, lt };
}

/**
 * Mengembalikan tanggal "hari ini" dalam format YYYY-MM-DD di timezone Jakarta (+07:00)
 */
export function getJakartaTodayStr(now: Date = new Date()): string {
  return formatJakartaDate(now);
}

/**
 * Mengonversi Date objek menjadi string format YYYY-MM-DD berdasarkan waktu Jakarta (+07:00)
 */
export function formatJakartaDate(date: Date): string {
  const d = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Mengonversi Date objek menjadi string format HH:mm berdasarkan waktu Jakarta (+07:00)
 */
export function formatJakartaTime(date: Date): string {
  const d = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}
