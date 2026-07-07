import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Automatically get the correct Eastern Time offset (handles daylight saving)
export function getEasternOffset(date) {
  const tz = Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(date));

  const offset = tz.find((p) => p.type === "timeZoneName")?.value || "GMT-4";
  const match = offset.match(/GMT([+-])(\d+)/);
  if (!match) return "-04:00";

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  return `${sign}${hours}:00`;
}

// Append timezone offset if not already present
function formatWithTz(time) {
  if (!time) return null;
  if (time.endsWith("Z") || time.match(/[+-]\d{2}:\d{2}$/)) return time;
  return `${time}${getEasternOffset(time)}`;
}

// Check if a time slot is available
export async function isSlotAvailable(startTime, endTime) {
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: formatWithTz(startTime),
      timeMax: formatWithTz(endTime),
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    },
  });

  const busy = response.data.calendars[process.env.GOOGLE_CALENDAR_ID].busy;
  return busy.length === 0;
}

// Get available slots for a given date
export async function getAvailableSlots(date) {
  const workingHours = [
    { start: "09:00", end: "09:30" },
    { start: "09:30", end: "10:00" },
    { start: "10:00", end: "10:30" },
    { start: "10:30", end: "11:00" },
    { start: "11:00", end: "11:30" },
    { start: "11:30", end: "12:00" },
    { start: "13:00", end: "13:30" },
    { start: "13:30", end: "14:00" },
    { start: "14:00", end: "14:30" },
    { start: "14:30", end: "15:00" },
    { start: "15:00", end: "15:30" },
    { start: "15:30", end: "16:00" },
  ];

  const availableSlots = [];

  for (const slot of workingHours) {
    const startTime = `${date}T${slot.start}:00`;
    const endTime = `${date}T${slot.end}:00`;

    const available = await isSlotAvailable(startTime, endTime);
    if (available) {
      availableSlots.push(`${slot.start} - ${slot.end}`);
    }
  }

  return availableSlots;
}

// Convert 24hr time string to 12hr format for display
function to12Hour(time24) {
  const [hourStr, minute] = time24.split(":");
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

// Format available slots in 12hr time for display
export function formatSlotsFor12Hour(slots) {
  return slots.map((slot) => {
    const [start, end] = slot.split(" - ");
    return `${to12Hour(start)} - ${to12Hour(end)}`;
  });
}

// Book an appointment
export async function bookAppointment(name, email, startTime, endTime) {
  const event = {
    summary: `Discovery Call — ${name}`,
    description: `Consultation call booked via Small Time AI website.\nClient email: ${email}`,
    organizer: {
      email: process.env.GOOGLE_CALENDAR_ID,
      self: true,
    },
    start: {
      dateTime: formatWithTz(startTime),
      timeZone: "America/New_York",
    },
    end: {
      dateTime: formatWithTz(endTime),
      timeZone: "America/New_York",
    },
    attendees: [
      { email: email },
      { email: process.env.GOOGLE_CALENDAR_ID }, // Fix 3: ensures owner gets email
    ],
    // Fix 2: creates Google Meet link automatically
    conferenceData: {
      createRequest: {
        requestId: `small-time-ai-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    // reminders: {
    //   useDefault: false,
    //   overrides: [
    //     { method: "email", minutes: 60 },
    //     { method: "popup", minutes: 15 },
    //   ],
    // },
  };

  // Fix 1: conferenceDataVersion: 1 is required for Google Meet to be created
  // Fix 3: sendUpdates: 'all' sends email to all attendees including owner
  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    sendNotifications: true,
  });

  return response.data;
}
