import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Check if a time slot is available
export async function isSlotAvailable(startTime, endTime) {
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime,
      timeMax: endTime,
      items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
    },
  });

  const busy = response.data.calendars[process.env.GOOGLE_CALENDAR_ID].busy;
  return busy.length === 0;
}

// Get your available slots for a given date
export async function getAvailableSlots(date) {
  // Your working hours — adjust these to your availability
  const workingHours = [
    { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' },
    { start: '11:30', end: '12:00' },
    { start: '13:00', end: '13:30' },
    { start: '13:30', end: '14:00' },
    { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' },
  ];

  const availableSlots = [];

  for (const slot of workingHours) {
    const startTime = new Date(`${date}T${slot.start}:00`).toISOString();
    const endTime = new Date(`${date}T${slot.end}:00`).toISOString();

    const available = await isSlotAvailable(startTime, endTime);
    if (available) {
      availableSlots.push(`${slot.start} - ${slot.end}`);
    }
  }

  return availableSlots;
}

// Book an appointment
export async function bookAppointment(name, email, startTime, endTime) {
  const event = {
    summary: `Discovery Call — ${name}`,
    description: `Consultation call booked via Small Time AI website.\nClient email: ${email}`,
    start: {
      dateTime: startTime,
      timeZone: 'America/New_York', // Change to your timezone
    },
    end: {
      dateTime: endTime,
      timeZone: 'America/New_York',
    },
    attendees: [
      { email: email },
      { email: process.env.GOOGLE_CALENDAR_ID },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: event,
    sendUpdates: 'all', // Sends email confirmation to both you and the client
  });

  return response.data;
}