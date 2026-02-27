// frontend/src/utils/calendarUtils.js
// Calendar integration utilities - Google Calendar, iCal, Outlook

/**
 * Generate Google Calendar URL for an event
 * @param {Object} event - Event details
 * @returns {string} Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event) => {
  const { title, description, location, startDate, endDate } = event;

  const formatDate = (date) => {
    return new Date(date)
      .toISOString()
      .replace(/-|:|\.\d{3}/g, "")
      .slice(0, -1);
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description || "",
    location: location || "",
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Calendar URL for an event
 * @param {Object} event - Event details
 * @returns {string} Outlook Calendar URL
 */
export const generateOutlookCalendarUrl = (event) => {
  const { title, description, location, startDate, endDate } = event;

  const formatDate = (date) => {
    return new Date(date).toISOString();
  };

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    body: description || "",
    location: location || "",
    startdt: formatDate(startDate),
    enddt: formatDate(endDate),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

/**
 * Generate Yahoo Calendar URL for an event
 * @param {Object} event - Event details
 * @returns {string} Yahoo Calendar URL
 */
export const generateYahooCalendarUrl = (event) => {
  const { title, description, location, startDate, endDate } = event;

  const formatDate = (date) => {
    return new Date(date)
      .toISOString()
      .replace(/-|:|\.\d{3}/g, "")
      .slice(0, -1);
  };

  // Calculate duration in hours and minutes
  const durationMs = new Date(endDate) - new Date(startDate);
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const duration = `${hours.toString().padStart(2, "0")}${minutes
    .toString()
    .padStart(2, "0")}`;

  const params = new URLSearchParams({
    v: "60",
    title: title,
    desc: description || "",
    in_loc: location || "",
    st: formatDate(startDate),
    dur: duration,
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
};

/**
 * Generate iCal/ICS file content
 * @param {Object} event - Event details
 * @returns {string} ICS file content
 */
export const generateICalContent = (event) => {
  const { title, description, location, startDate, endDate, uid } = event;

  const formatDate = (date) => {
    return (
      new Date(date)
        .toISOString()
        .replace(/-|:|\.\d{3}/g, "")
        .slice(0, -1) + "Z"
    );
  };

  const escapeText = (text) => {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const now = formatDate(new Date());
  const eventUid = uid || `${Date.now()}-sharetogether@sharetogether.com`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ShareTogether//Pickup Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${eventUid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${escapeText(title)}`,
    description ? `DESCRIPTION:${escapeText(description)}` : "",
    location ? `LOCATION:${escapeText(location)}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Pickup reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return icsContent;
};

/**
 * Download ICS file
 * @param {Object} event - Event details
 * @param {string} filename - Optional filename
 */
export const downloadICalFile = (event, filename = "pickup-schedule.ics") => {
  const icsContent = generateICalContent(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Create calendar event object from schedule
 * @param {Object} schedule - Schedule object from API
 * @returns {Object} Event object for calendar functions
 */
export const scheduleToCalendarEvent = (schedule) => {
  const {
    listing,
    proposedDate,
    proposedTime,
    pickupLocation,
    donorNotes,
    _id,
  } = schedule;

  // Parse date and time
  const [hours, minutes] = (proposedTime || "10:00").split(":").map(Number);
  const startDate = new Date(proposedDate);
  startDate.setHours(hours, minutes, 0, 0);

  // End date is 1 hour after start by default
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);

  // Format location
  let location = "";
  if (pickupLocation) {
    if (typeof pickupLocation === "string") {
      location = pickupLocation;
    } else if (pickupLocation.address) {
      location = pickupLocation.address;
    } else if (pickupLocation.coordinates) {
      location = `${pickupLocation.coordinates[1]}, ${pickupLocation.coordinates[0]}`;
    }
  }

  return {
    title: `📦 Pickup: ${listing?.title || "Donation Item"}`,
    description: `ShareTogether Pickup\n\nItem: ${
      listing?.title || "Unknown"
    }\nCategory: ${listing?.category || "N/A"}\n${
      donorNotes ? `\nNotes: ${donorNotes}` : ""
    }\n\nView details at: ${window.location.origin}/schedules`,
    location,
    startDate,
    endDate,
    uid: `schedule-${_id}@sharetogether.com`,
  };
};

/**
 * Get all calendar links for a schedule
 * @param {Object} schedule - Schedule object
 * @returns {Object} Object with calendar URLs
 */
export const getCalendarLinks = (schedule) => {
  const event = scheduleToCalendarEvent(schedule);

  return {
    google: generateGoogleCalendarUrl(event),
    outlook: generateOutlookCalendarUrl(event),
    yahoo: generateYahooCalendarUrl(event),
    downloadIcs: () => downloadICalFile(event, `pickup-${schedule._id}.ics`),
  };
};

const calendarUtils = {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  generateICalContent,
  downloadICalFile,
  scheduleToCalendarEvent,
  getCalendarLinks,
};

export default calendarUtils;
