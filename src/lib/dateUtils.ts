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
  
  let cleanTime = timeStr.trim();
  if (cleanTime.includes('T')) {
    cleanTime = cleanTime.split('T')[1];
  }
  if (cleanTime.length === 5) {
    cleanTime = `${cleanTime}:00`;
  } else if (cleanTime.length > 8) {
    cleanTime = cleanTime.substring(0, 8);
  }

  // Format: "YYYY-MM-DD HH:mm:ss"
  const dateStringWithTime = `${dateStr} ${cleanTime}`;
  
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

/**
 * Formats a student's last login / activity timestamp into both a friendly relative string
 * and an exact localized timestamp.
 */
export const formatLastLogin = (dateInput?: string | number | Date | null): {
  relative: string;
  exact: string;
  isRecent: boolean;
} => {
  if (!dateInput) {
    return {
      relative: 'Never logged in',
      exact: 'No platform login recorded yet',
      isRecent: false,
    };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      relative: 'Never logged in',
      exact: 'No platform login recorded yet',
      isRecent: false,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isRecent = diffHours < 48; // Active in last 48h
  const exact = format(d, "MMM d, yyyy 'at' HH:mm");

  if (diffMins < 1) {
    return { relative: 'Just now', exact, isRecent: true };
  }
  if (diffMins < 60) {
    return { relative: `${diffMins} min${diffMins > 1 ? 's' : ''} ago`, exact, isRecent: true };
  }
  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return { relative: `Today at ${format(d, 'HH:mm')}`, exact, isRecent: true };
  }
  if (diffHours < 48) {
    return { relative: `Yesterday at ${format(d, 'HH:mm')}`, exact, isRecent: true };
  }
  if (diffDays < 7) {
    return { relative: `${diffDays} days ago (${format(d, 'EEE')})`, exact, isRecent: false };
  }
  return { relative: format(d, 'MMM d, yyyy'), exact, isRecent: false };
};

