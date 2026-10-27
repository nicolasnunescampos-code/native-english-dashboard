import { format, parseISO } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export interface GoogleCalendarEventParams {
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm or ISO
  endTime?: string; // HH:mm or ISO
  timezone?: string; // e.g. 'America/Sao_Paulo'
  description?: string;
  location?: string;
}

/**
 * Formats a date & time string into Google Calendar's required format: YYYYMMDDTHHmmSSZ (in UTC)
 */
function toGCalUtcString(dateStr: string, timeStr: string, timeZone: string): string {
  try {
    const cleanTime = timeStr.includes('T') ? timeStr.split('T')[1].substring(0, 5) : timeStr;
    const [hours, minutes] = cleanTime.split(':').map(Number);
    
    // Construct local datetime and convert to UTC
    const localDateTimeStr = `${dateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    const utcDate = fromZonedTime(localDateTimeStr, timeZone);
    
    // Convert to ISO string without dashes/colons in UTC
    return utcDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  } catch (err) {
    // Fallback: simple formatted string
    const cleanDate = dateStr.replace(/-/g, '');
    const cleanTime = (timeStr || '10:00').replace(':', '') + '00';
    return `${cleanDate}T${cleanTime}Z`;
  }
}

/**
 * Builds a direct URL to create an event in Google Calendar
 */
export function buildGoogleCalendarUrl({
  title,
  date,
  startTime = '10:00',
  endTime = '10:50',
  timezone = 'America/Sao_Paulo',
  description = '',
  location = ''
}: GoogleCalendarEventParams): string {
  const startUtc = toGCalUtcString(date, startTime, timezone);
  const endUtc = toGCalUtcString(date, endTime, timezone);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    ctz: timezone,
  });

  if (description) {
    params.set('details', description);
  }

  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Opens Google Calendar event creator in a new browser tab
 */
export function openGoogleCalendarEvent(params: GoogleCalendarEventParams): void {
  const url = buildGoogleCalendarUrl(params);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
