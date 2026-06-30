import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const dateStr = '2026-05-14 10:00:00';
const tz = 'America/New_York';

// fromZonedTime gives us a Date object in local time that corresponds to that moment in time
const utcDate = fromZonedTime(dateStr, tz);

console.log('UTC date:', utcDate.toISOString());
console.log('Local time formatted:', format(utcDate, 'HH:mm'));
