/**
 * Standardizes date formatting to French style (DD/MM/YYYY)
 * across the application.
 */
export function formatDate(date: string | Date | undefined | null): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formats date with time: DD/MM/YYYY, HH:mm
 */
export function formatDateTime(date: string | Date | undefined | null): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins  = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year}, ${hours}:${mins}`;
}

/**
 * Formats date for input[type="date"] (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
