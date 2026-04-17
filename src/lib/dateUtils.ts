import { format } from "date-fns";

/**
 * Base Time Zone for the school (Brasília Time)
 * We assume all times in the database are stored relative to this zone.
 * Offset is -03:00.
 */
const SCHOOL_TZ_OFFSET = "-03:00";

/**
 * Formats a Class Date and Time from the database (School Time) to the User's Local Time.
 * 
 * @param dateStr YYYY-MM-DD
 * @param timeStr HH:mm
 * @returns Formatted string e.g. "14:00" or "Feb 10, 14:00" if date changes.
 */
export const formatClassTime = (dateStr: string, timeStr: string | undefined | null): string => {
  if (!timeStr) return "TBA";

  try {
    // 1. Construct an ISO string with the fixed School Offset
    // format: YYYY-MM-DDTHH:mm:00-03:00
    const isoString = `${dateStr}T${timeStr}:00${SCHOOL_TZ_OFFSET}`;
    
    // 2. Create a Date object (Browser automatically converts to Local Time)
    const localDate = new Date(isoString);

    // 3. Format strictly the time part in local time
    // We utilize date-fns format, which works on the local date object
    return format(localDate, "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeStr; // Fallback to original string
  }
};

/**
 * Converts School Date/Time to User's Local Date object.
 */
export const toLocalDate = (dateStr: string, timeStr: string | undefined | null): Date => {
  if (!timeStr) return new Date(dateStr); // Fallback
  const isoString = `${dateStr}T${timeStr}:00${SCHOOL_TZ_OFFSET}`;
  return new Date(isoString);
};

/**
 * Returns the detected time zone label (e.g. "Brasilia Time" or "GMT-3") if possible, 
 * or just the code. 
 */
export const getTimeZoneLabel = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
};

/**
 * Returns the full localized date and time string.
 * Useful for tooltips or detailed views.
 */
export const formatClassDateTime = (dateStr: string, timeStr: string): string => {
    try {
        const localDate = toLocalDate(dateStr, timeStr);
        return format(localDate, "MMM d, HH:mm");
    } catch (e) {
        return `${dateStr} ${timeStr}`;
    }
}

/**
 * Returns the user's detected time zone (e.g., "America/New_York")
 */
export const getUserTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

