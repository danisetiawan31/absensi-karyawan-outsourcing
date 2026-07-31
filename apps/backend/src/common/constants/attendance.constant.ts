/**
 * Ambang batas waktu keterlambatan 15 menit (dalam milidetik).
 * Digunakan untuk 2 tujuan:
 * 1. Cron job eskalasi notifikasi T+15 ke supervisor (attendance-cron.service.ts)
 * 2. Filter shift kosong real-time pada dashboard supervisor (dashboard.service.ts)
 */
export const UNFILLED_SHIFT_THRESHOLD_MS = 15 * 60 * 1000;
