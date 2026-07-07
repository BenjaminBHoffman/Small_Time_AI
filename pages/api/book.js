import { getAvailableSlots, bookAppointment, isSlotAvailable } from '../../lib/calendar';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action, date, name, email, startTime, endTime } = req.body;

  try {
    // Get available slots for a date
    if (action === 'getSlots') {
      const slots = await getAvailableSlots(date);
      return res.status(200).json({ slots });
    }

    // Book an appointment
    if (action === 'book') {
      const available = await isSlotAvailable(startTime, endTime);

      if (!available) {
        return res.status(200).json({
          success: false,
          message: 'That slot was just taken. Please choose another time.',
        });
      }

      const event = await bookAppointment(name, email, startTime, endTime);
      return res.status(200).json({
        success: true,
        eventId: event.id,
        message: `Confirmed! Your discovery call is booked for ${new Date(startTime).toLocaleString()}.`,
      });
    }

  } catch (err) {
    console.error('Calendar error:', err);
    return res.status(500).json({ message: 'Calendar error: ' + err.message });
  }
}