import {
  getAvailableSlots,
  bookAppointment,
  isSlotAvailable,
  formatSlotsFor12Hour,
  getEasternOffset,
} from "../../lib/calendar";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, date, name, email, startTime, endTime } = req.body;

  console.log("=== BOOK API CALLED ===");
  console.log("Action:", action);
  console.log("Raw body:", JSON.stringify(req.body, null, 2));

  try {
    if (action === "getSlots") {
      console.log("Fetching slots for date:", date);

      // Block same-day and past bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requestedDate = new Date(`${date}T00:00:00`);

      if (requestedDate <= today) {
        return res.status(200).json({
          slots: [],
          blocked: true,
          message:
            "Same-day bookings are not available. Please choose a date starting from tomorrow.",
        });
      }

      const slots = await getAvailableSlots(date);
      const slots12hr = formatSlotsFor12Hour(slots);
      console.log("Slots returned:", slots12hr);
      return res.status(200).json({ slots: slots12hr });
    }

    if (action === "book") {
      console.log("Attempting booking with:");
      console.log("  name:", name);
      console.log("  email:", email);
      console.log("  startTime (raw):", startTime);
      console.log("  endTime (raw):", endTime);

      const formatTime = (time) => {
        if (!time) return null;
        // If missing seconds, add them
        if (time.match(/T\d{2}:\d{2}$/)) return `${time}:00`;
        return time;
      };

      const formattedStart = formatTime(startTime);
      const formattedEnd = formatTime(endTime);

      console.log("  startTime (formatted):", formattedStart);
      console.log("  endTime (formatted):", formattedEnd);

      if (!formattedStart || !formattedEnd) {
        return res.status(200).json({
          success: false,
          message:
            "I had trouble reading that time slot. Could you confirm the time you wanted?",
        });
      }

      // Validate ISO format before sending to Google
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
      if (!isoRegex.test(formattedStart) || !isoRegex.test(formattedEnd)) {
        console.log("INVALID FORMAT DETECTED");
        console.log("  start valid:", isoRegex.test(formattedStart));
        console.log("  end valid:", isoRegex.test(formattedEnd));
        return res.status(200).json({
          success: false,
          message:
            "I had trouble formatting that time. Could you confirm the time you wanted?",
        });
      }

      const available = await isSlotAvailable(formattedStart, formattedEnd);
      console.log("Slot available:", available);

      if (!available) {
        return res.status(200).json({
          success: false,
          message: "That slot was just taken. Please choose another time.",
        });
      }

      console.log("Inserting into calendar:", process.env.GOOGLE_CALENDAR_ID);
      console.log("Calling bookAppointment...");
      const event = await bookAppointment(
        name,
        email,
        formattedStart,
        formattedEnd,
      );
      console.log("Event created:", event.id);

      // Get Google Meet link if available
      const meetLink =
        event.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === "video",
        )?.uri || null;

      // Append Eastern offset before formatting so JS interprets it correctly
      const easternOffset = getEasternOffset(formattedStart);
      const startWithTz = `${formattedStart}${easternOffset}`;

      const friendlyTime = new Date(startWithTz).toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const confirmMessage = meetLink
        ? `Your discovery call is confirmed for ${friendlyTime}. A calendar invite with the Google Meet link has been sent to ${email}. You can also join here: ${meetLink}`
        : `Your discovery call is confirmed for ${friendlyTime}. A calendar invite has been sent to ${email}.`;

      return res.status(200).json({
        success: true,
        eventId: event.id,
        meetLink,
        message: confirmMessage,
      });
    }
  } catch (err) {
    console.log("=== CALENDAR ERROR ===");
    console.log("Error message:", err.message);
    console.log("Error details:", JSON.stringify(err, null, 2));
    return res.status(500).json({ message: "Calendar error: " + err.message });
  }
}
