import {
  getAvailableSlots,
  bookAppointment,
  isSlotAvailable,
} from "../../lib/calendar";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, date, name, email, startTime, endTime } = req.body;

  try {
    // Get available slots for a date
    if (action === "getSlots") {
      const slots = await getAvailableSlots(date);
      return res.status(200).json({ slots });
    }

    // Book an appointment
    if (action === "book") {
      // Ensure times are valid ISO format with seconds
      const formatTime = (time) => {
        if (!time) return null;
        // If missing seconds, add them
        if (time.match(/T\d{2}:\d{2}$/)) return `${time}:00`;
        return time;
      };

      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);

      console.log("Booking:", { name, email, formattedStart, formattedEnd });

      if (!formattedStart || !formattedEnd) {
        return res.status(200).json({
          success: false,
          message:
            "I had trouble reading that time slot. Could you confirm the time you wanted?",
        });
      }

      const available = await isSlotAvailable(formattedStart, formattedEnd);

      if (!available) {
        return res.status(200).json({
          success: false,
          message: "That slot was just taken. Please choose another time.",
        });
      }

      const event = await bookAppointment(
        name,
        email,
        formattedStart,
        formattedEnd,
      );
      return res.status(200).json({
        success: true,
        eventId: event.id,
        message: `Your discovery call is confirmed! You are booked for ${new Date(formattedStart).toLocaleString('en-US', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}. A calendar invite is on its way to ${email}!`,
      });
    }
  } catch (err) {
    console.error("Calendar error:", err);
    return res.status(500).json({ message: "Calendar error: " + err.message });
  }
}
