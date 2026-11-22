// Is it Shabbat for this visitor right now? Candle lighting -> Havdalah, by the visitor's time zone.
import { HebrewCalendar, Location } from '@hebcal/core';

const TZ_CITY = {
  'Asia/Jerusalem': 'Tel Aviv', 'Asia/Tel_Aviv': 'Tel Aviv',
  'America/New_York': 'New York', 'America/Chicago': 'Chicago', 'America/Denver': 'Denver', 'America/Los_Angeles': 'Los Angeles',
  'America/Phoenix': 'Phoenix', 'America/Toronto': 'Toronto', 'America/Montreal': 'Montreal', 'America/Vancouver': 'Vancouver',
  'America/Mexico_City': 'Mexico City', 'America/Sao_Paulo': 'Sao Paulo', 'America/Argentina/Buenos_Aires': 'Buenos Aires', 'America/Panama': 'Panama City',
  'Europe/London': 'London', 'Europe/Paris': 'Paris', 'Europe/Berlin': 'Berlin', 'Europe/Amsterdam': 'Amsterdam', 'Europe/Brussels': 'Brussels',
  'Europe/Rome': 'Rome', 'Europe/Madrid': 'Madrid', 'Europe/Vienna': 'Vienna', 'Europe/Zurich': 'Zurich', 'Europe/Budapest': 'Budapest',
  'Europe/Prague': 'Prague', 'Europe/Warsaw': 'Warsaw', 'Europe/Moscow': 'Moscow', 'Europe/Kiev': 'Kiev', 'Europe/Kyiv': 'Kiev', 'Europe/Istanbul': 'Istanbul',
  'Africa/Johannesburg': 'Johannesburg', 'Australia/Sydney': 'Sydney', 'Australia/Melbourne': 'Melbourne', 'Australia/Perth': 'Perth', 'Asia/Dubai': 'Dubai', 'Asia/Hong_Kong': 'Hong Kong'
};

function visitorLocation() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  const name = TZ_CITY[tz];
  return name ? Location.lookup(name) : null;
}

export function shabbatNow(now = new Date()) {
  const q = new URLSearchParams(location.search).get('shabbat');
  const loc = visitorLocation();
  let start = null, end = null;
  if (loc) {
    const from = new Date(now.getTime() - 3 * 864e5), to = new Date(now.getTime() + 8 * 864e5);
    const evs = HebrewCalendar.calendar({ start: from, end: to, location: loc, candlelighting: true, noHolidays: true });
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i];
      if (e.getDesc() !== 'Candle lighting' || !e.eventTime) continue;
      const hv = evs.slice(i + 1).find((x) => x.getDesc() === 'Havdalah' && x.eventTime);
      if (!hv) continue;
      if (hv.eventTime > now) { start = e.eventTime; end = hv.eventTime; break; }
    }
  }
  if (!start) { // unknown place: Friday 18:00 to Saturday 19:30, local time
    const d = new Date(now), day = d.getDay();
    const fri = new Date(d); fri.setDate(d.getDate() - ((day + 2) % 7)); fri.setHours(18, 0, 0, 0);
    if (day === 6 && d.getHours() >= 20) fri.setDate(fri.getDate() + 7);
    start = fri; end = new Date(fri.getTime() + 25.5 * 36e5);
  }
  const on = q === '1' ? true : q === '0' ? false : now >= start && now < end;
  const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { on, start, end, havdalah: fmt(end), city: loc ? loc.getName() : '' };
}
