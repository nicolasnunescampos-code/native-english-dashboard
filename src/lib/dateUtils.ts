import { format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Base Time Zone for the school (Brasilia Time)
 * We assume all times in the database are scheduled relative to this zone.
 * Using IANA time zone handles Daylight Saving Time automatically.
 */
const SCHOOL_TZ = "America/Sao_Paulo";

/**
 * Converts School Date/Time to User's Local Date object.
 */
export const toLocalDate = (dateStr: string, timeStr: string | undefined | null, sourceTz: string = SCHOOL_TZ): Date => {
  if (!timeStr) return new Date(dateStr); // Fallback
  
  // Format: "YYYY-MM-DD HH:mm:00"
  const dateStringWithTime = `${dateStr} ${timeStr}:00`;
  
  // Interprets the date string as being in the provided source timezone, 
  // and returns a standard Date object representing that exact moment in UTC/Local.
  return fromZonedTime(dateStringWithTime, sourceTz);
};

/**
 * Formats a Class Date and Time from the database to the User's Local Time.
 * 
 * @param dateStr YYYY-MM-DD
 * @param timeStr HH:mm
 * @param sourceTz Original timezone of the class (defaults to SCHOOL_TZ)
 * @returns Formatted string e.g. "14:00"
 */
export const formatClassTime = (dateStr: string, timeStr: string | undefined | null, sourceTz: string = SCHOOL_TZ): string => {
  if (!timeStr) return "TBA";

  try {
    const localDate = toLocalDate(dateStr, timeStr, sourceTz);

    // Format strictly the time part in local time
    return format(localDate, "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeStr; // Fallback to original string
  }
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

