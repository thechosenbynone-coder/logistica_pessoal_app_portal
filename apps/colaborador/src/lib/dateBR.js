const DATE_BR_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function isValidDateBR(value) {
  if (!value || typeof value !== 'string') return false;
  const match = value.match(DATE_BR_REGEX);
  if (!match) return false;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function parseDateBRtoISO(value) {
  if (!isValidDateBR(value)) return '';
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(isoOrDate) {
  if (!isoOrDate) return '—';

  if (typeof isoOrDate === 'string' && isValidDateBR(isoOrDate)) {
    return isoOrDate;
  }

  if (typeof isoOrDate === 'string') {
    const datePart = isoOrDate.includes('T') ? isoOrDate.split('T')[0] : isoOrDate;
    const [year, month, day] = datePart.split('-');
    if (year?.length === 4 && month && day) {
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }

  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
