/**
 * Date utilities
 */

/**
 * Returns current date in YYYY-MM-DD format.
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY).
 * Avoids timezone issues by parsing the string directly.
 */
export function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Formats an ISO date or Date object to HH:mm:ss (Brazilian locale).
 */
export function formatTimeBR(dateLike) {
  if (!dateLike) return '--:--';
  try {
    const d = new Date(dateLike);
    return d.toLocaleTimeString('pt-BR');
  } catch {
    return '--:--';
  }
}

/**
 * Calculates minutes between two dates.
 */
export function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.floor((e - s) / 60000);
  return diff >= 0 ? diff : 0;
}

/**
 * Sums minutes of pauses (array with { start, end } objects).
 */
export function sumPauseMinutes(pauses = []) {
  return pauses.reduce((acc, p) => {
    if (p.start && p.end) {
      return acc + minutesBetween(p.start, p.end);
    }
    return acc;
  }, 0);
}
