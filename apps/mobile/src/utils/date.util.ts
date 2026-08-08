/**
 * Utilitas Terpusat Penanganan Tanggal & Timezone Asia/Jakarta (+07:00) pada Mobile Client
 */

export const JAKARTA_TIMEZONE = 'Asia/Jakarta';

function parseDateInput(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Format Date / ISO string menjadi string tanggal & waktu lokal Jakarta (e.g. "8 Agt 2026, 14:00")
 */
export function formatJakartaDateTime(
  dateOrIso: Date | string | null | undefined,
): string {
  const d = parseDateInput(dateOrIso);
  if (!d) return '-';

  const dateStr = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: JAKARTA_TIMEZONE,
  });

  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: JAKARTA_TIMEZONE,
  });

  return `${dateStr}, ${timeStr.replace(/\./g, ':')}`;
}

/**
 * Format Date / ISO string menjadi string tanggal lokal Jakarta (e.g. "8 Agt 2026")
 */
export function formatJakartaDate(
  dateOrIso: Date | string | null | undefined,
): string {
  const d = parseDateInput(dateOrIso);
  if (!d) return '-';

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: JAKARTA_TIMEZONE,
  });
}

/**
 * Format rentang 2 ISO string tanggal menjadi "8 Agt 2026" (jika sama hari) atau "8 Agt 2026 – 10 Agt 2026"
 */
export function formatJakartaDateRange(
  tanggalMulaiIso: string | null | undefined,
  tanggalSelesaiIso: string | null | undefined,
): string {
  if (!tanggalMulaiIso || !tanggalSelesaiIso) return '-';
  const startStr = formatJakartaDate(tanggalMulaiIso);
  const endStr = formatJakartaDate(tanggalSelesaiIso);

  if (startStr === '-' || endStr === '-') return '-';
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} – ${endStr}`;
}

/**
 * Mengonversi Date objek menjadi string format YYYY-MM-DD berdasarkan waktu Jakarta
 */
export function formatJakartaYmd(date: Date | null | undefined): string {
  const d = parseDateInput(date);
  if (!d) return '';

  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: JAKARTA_TIMEZONE,
  };

  const parts = new Intl.DateTimeFormat('en-CA', opts).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
}

/**
 * Format Date / ISO string menjadi jam format HH:mm di timezone Jakarta (e.g. "14:00")
 */
export function formatJakartaTime(
  dateOrIso: Date | string | null | undefined,
): string {
  const d = parseDateInput(dateOrIso);
  if (!d) return '-';

  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: JAKARTA_TIMEZONE,
  });

  return timeStr.replace(/\./g, ':');
}
