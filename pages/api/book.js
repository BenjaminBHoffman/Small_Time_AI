import { getAvailableSlots, bookAppointment, isSlotAvailable } from '../../lib/calendar';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, date, name, email, startTime, endTime } = req.body;

  console.log('=== BOOK API CALLED ===');
  console.log('Action:', action);
  console.log('Raw body:', JSON.stringify(req.body, null, 2));

  try {
    if (action === 'getSlots') {
      console.log('Fetching slots for date:', date);
      const slots = await getAvailableSlots(date);
      console.log('Slots returned:', slots);
      return res.status(200).json({ slots });
    }

    if (action === 'book') {
      console.log('Attempting booking with:');
      console.log('  name:', name);
      console.log('  email:', email);
      console.log('  startTime (raw):', startTime);
      console.log('  endTime (raw):', endTime);

      const formatTime = (time) => {
        if (!time) return null;
        if (time.match(/T\d{2}:\d{2}$/)) return `${time}:00`;
        return time;
      };

      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);

      console.log('  startTime (formatted):', formattedStart);
      console.log('  endTime (formatted):', formattedEnd);

      if (!formattedStart || !formattedEnd) {
        return res.status(200).json({
          success: false,
          message: 'I had trouble reading that time slot. Could you confirm the time you wanted?'
        });
      }

      // Validate ISO format before sending to Google
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
      if (!isoRegex.test(formattedStart) || !isoRegex.test(formattedEnd)) {
        console.log('INVALID FORMAT DETECTED');
        console.log('  start valid:', isoRegex.test(formattedStart));
        console.log('  end valid:', isoRegex.test(formattedEnd));
        return res.status(200).json({
          success: false,
          message: `I had trouble formatting that time. Could you confirm the time you wanted?`
        });
      }

      const available = await isSlotAvailable(formattedStart, formattedEnd);
      console.log('Slot available:', available);

      if (!available) {
        return res.status(200).json({
          success: false,
          message: 'That slot was just taken. Please choose another time.',
        });
      }

      console.log('Calling bookAppointment...');
      const event = await bookAppointment(name, email, formattedStart, formattedEnd);
      console.log('Event created:', event.id);

      return res.status(200).json({
        success: true,
        eventId: event.id,
        message: `Your discovery call is confirmed! You are booked for ${new Date(formattedStart).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}. A calendar invite is on its way to ${email}!`,
      });
    }

  } catch (err) {
    console.log('=== CALENDAR ERROR ===');
    console.log('Error message:', err.message);
    console.log('Error details:', JSON.stringify(err, null, 2));
    return res.status(500).json({ message: 'Calendar error: ' + err.message });
  }
}