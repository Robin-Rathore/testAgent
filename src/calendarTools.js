import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { google } from "googleapis";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Set up OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set credentials using refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
  

async function sendMeetingEmail(clientEmail, clientName, meetingDetails) {
    const mailOptions = {
      from: process.env.EMAIL,
      to: clientEmail,
      subject: `Meeting Scheduled: ${meetingDetails.subject}`,
      text: `Hello ${clientName},\n\nYour meeting has been scheduled.\n\nDetails:\nSubject: ${meetingDetails.subject}\nDate: ${meetingDetails.date}\nTime: ${meetingDetails.time}\nLocation: ${meetingDetails.location}\n\nJoin Link: ${meetingDetails.isVideoConference ? meetingDetails.location : "Not a video call"}\n\nLooking forward to our discussion!\n\nBest Regards,\nRobin Rathore`,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

// Create calendar client
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Convert date strings to RFC3339 format for Google Calendar API
function formatDateTimeForGoogle(dateStr, timeStr, timeZone = 'America/Los_Angeles') {
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
  const [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
  
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  return date.toISOString();
}

// Determine meeting duration based on meeting type
function getMeetingDurationMinutes(meetingType) {
  switch(meetingType.toLowerCase()) {
    case 'initial consultation':
      return 60;
    case 'proposal review':
      return 45;
    case 'status update':
      return 30;
    case 'technical discussion':
      return 60;
    default:
      return 30; // Default to 30 minutes
  }
}

// Check calendar availability
const checkAvailability = tool(
  async ({ startDate, endDate, timeZone = 'America/Los_Angeles' }) => {
    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          timeZone: timeZone,
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy;
      const availableTimes = [];
      
      // Process the busy time slots to find available slots
      // This is a simplified version - in a real implementation,
      // you'd want more sophisticated availability calculation
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      // Only consider business hours (9 AM to 5 PM)
      const businessStartHour = 9;
      const businessEndHour = 17;
      
      // Create dates for each day in the range
      let currentDate = new Date(startDateTime);
      while (currentDate <= endDateTime) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          
          // Check availability for each hour during business hours
          for (let hour = businessStartHour; hour < businessEndHour; hour++) {
            const startTime = `${String(hour).padStart(2, '0')}:00`;
            const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
            
            const slotStart = new Date(`${dateString}T${startTime}:00.000${timeZone === 'America/Los_Angeles' ? '-08:00' : '+00:00'}`);
            const slotEnd = new Date(`${dateString}T${endTime}:00.000${timeZone === 'America/Los_Angeles' ? '-08:00' : '+00:00'}`);
            
            // Check if this slot conflicts with any busy times
            const isSlotBusy = busySlots.some(busy => {
              const busyStart = new Date(busy.start);
              const busyEnd = new Date(busy.end);
              return (
                (slotStart >= busyStart && slotStart < busyEnd) ||
                (slotEnd > busyStart && slotEnd <= busyEnd) ||
                (slotStart <= busyStart && slotEnd >= busyEnd)
              );
            });
            
            if (!isSlotBusy) {
              availableTimes.push({
                date: dateString,
                startTime: startTime,
                endTime: endTime,
              });
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Return top 5 available slots for simplicity
      return JSON.stringify({
        available: availableTimes.length > 0,
        availableSlots: availableTimes.slice(0, 5),
        timeZone: timeZone,
      });
    } catch (error) {
      return JSON.stringify({
        error: `Error checking availability: ${error.message}`,
        available: false,
      });
    }
  },
  {
    name: "checkAvailability",
    description: "Check Robin's calendar for available meeting slots",
    schema: z.object({
      startDate: z.string().describe("Start date for availability check (YYYY-MM-DD)"),
      endDate: z.string().describe("End date for availability check (YYYY-MM-DD)"),
      timeZone: z.string().optional().describe("Time zone (default: America/Los_Angeles)"),
    }),
  }
);

// Schedule a meeting
const scheduleMeeting = tool(
  async ({ 
    clientName, 
    clientEmail, 
    date, 
    startTime, 
    meetingType,
    projectName = '', 
    notes = '',
    location = 'Google Meet', 
    timeZone = 'America/Los_Angeles'
  }) => {
    try {
      const meetingDuration = getMeetingDurationMinutes(meetingType);
      const startDateTime = formatDateTimeForGoogle(date, startTime, timeZone);
      
      // Calculate end time by adding duration
      const endDateTime = new Date(new Date(startDateTime).getTime() + meetingDuration * 60000).toISOString();
      
      // Default to video conference if location is Google Meet or Zoom
      const useVideoConference = location.toLowerCase().includes('google meet') || 
                                 location.toLowerCase().includes('zoom');
      
      const meetingSubject = `${meetingType}: ${clientName} - ${projectName || 'Portfolio Discussion'}`;
      const meetingDescription = `
Meeting with ${clientName}
Email: ${clientEmail}
Type: ${meetingType}
${projectName ? `Project: ${projectName}` : ''}
${notes ? `\nNotes: ${notes}` : ''}

Automatically scheduled by Portfolio Assistant.
      `.trim();

      // Create calendar event
      const event = {
        summary: meetingSubject,
        description: meetingDescription,
        start: {
          dateTime: startDateTime,
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timeZone,
        },
        attendees: [
          { email: clientEmail },
          { email: 'robinsingh248142@gmail.com' }, // Robin's email
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      };
      
      // Add conference details if needed
      if (useVideoConference) {
        event.conferenceData = {
          createRequest: {
            requestId: `meeting-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      } else {
        event.location = location;
      }
      
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all', // Send email notifications to attendees
        conferenceDataVersion: useVideoConference ? 1 : 0,
      });

      const meetingDetails = {
        subject: event.summary,
        with: clientName,
        date,
        time: `${startTime} - ${new Date(endDateTime).toLocaleTimeString()}`,
        location: useVideoConference && response.data.hangoutLink ? response.data.hangoutLink : location,
        isVideoConference: useVideoConference,
      };

      await sendMeetingEmail(clientEmail, clientName, meetingDetails);
      
      return JSON.stringify({
        success: true,
        meetingId: response.data.id,
        meetingLink: response.data.htmlLink,
        meetingDetails: {
          subject: meetingSubject,
          with: clientName,
          date: date,
          time: `${startTime} - ${new Date(endDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          location: useVideoConference && response.data.hangoutLink ? response.data.hangoutLink : location,
          isVideoConference: useVideoConference,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error scheduling meeting: ${error.message}`,
      });
    }
  },
  {
    name: "scheduleMeeting",
    description: "Schedule a meeting on Robin's calendar and send invitations",
    schema: z.object({
      clientName: z.string().describe("Name of the client or attendee"),
      clientEmail: z.string().describe("Email address of the client for invitation"),
      date: z.string().describe("Meeting date (YYYY-MM-DD)"),
      startTime: z.string().describe("Meeting start time (HH:MM in 24-hour format)"),
      meetingType: z.string().describe("Type of meeting (initial consultation, proposal review, status update, etc.)"),
      projectName: z.string().optional().describe("Name of the project being discussed (optional)"),
      notes: z.string().optional().describe("Additional notes or agenda for the meeting (optional)"),
      location: z.string().optional().describe("Meeting location or 'Google Meet' for video conference (default: Google Meet)"),
      timeZone: z.string().optional().describe("Time zone (default: America/Los_Angeles)"),
    }),
  }
);

// Reschedule a meeting
const rescheduleMeeting = tool(
  async ({ 
    meetingId, 
    newDate, 
    newStartTime, 
    clientEmail,
    reason = 'Schedule change requested', 
    timeZone = 'America/Los_Angeles' 
  }) => {
    try {
      // First get the existing event
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: meetingId,
      });
      
      const event = existingEvent.data;
      
      // Determine meeting duration from existing event
      const existingStart = new Date(event.start.dateTime);
      const existingEnd = new Date(event.end.dateTime);
      const durationMinutes = Math.round((existingEnd - existingStart) / 60000);
      
      // Update start and end times
      const startDateTime = formatDateTimeForGoogle(newDate, newStartTime, timeZone);
      const endDateTime = new Date(new Date(startDateTime).getTime() + durationMinutes * 60000).toISOString();
      
      // Update event description to include rescheduling information
      const updatedDescription = `${event.description}\n\nRescheduled: ${reason}\nPrevious time: ${existingStart.toLocaleString()}`;
      
      // Update the event
      const updatedEvent = {
        ...event,
        start: {
          dateTime: startDateTime,
          timeZone: timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timeZone,
        },
        description: updatedDescription,
      };
      
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: meetingId,
        resource: updatedEvent,
        sendUpdates: 'all', // Send email notifications to attendees
      });
      
      return JSON.stringify({
        success: true,
        meetingId: response.data.id,
        meetingLink: response.data.htmlLink,
        rescheduled: true,
        meetingDetails: {
          date: newDate,
          time: `${newStartTime} - ${new Date(endDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
          location: response.data.hangoutLink || response.data.location,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error rescheduling meeting: ${error.message}`,
      });
    }
  },
  {
    name: "rescheduleMeeting",
    description: "Reschedule an existing meeting to a new date and time",
    schema: z.object({
      meetingId: z.string().describe("ID of the existing meeting to reschedule"),
      newDate: z.string().describe("New meeting date (YYYY-MM-DD)"),
      newStartTime: z.string().describe("New meeting start time (HH:MM in 24-hour format)"),
      clientEmail: z.string().describe("Email address of the client for notification"),
      reason: z.string().optional().describe("Reason for rescheduling (optional)"),
      timeZone: z.string().optional().describe("Time zone (default: America/Los_Angeles)"),
    }),
  }
);

// Cancel a meeting
const cancelMeeting = tool(
  async ({ 
    meetingId, 
    reason = 'Cancellation requested', 
    sendNotification = true 
  }) => {
    try {
      // First get the existing event to preserve details for the response
      const existingEvent = await calendar.events.get({
        calendarId: 'primary',
        eventId: meetingId,
      });
      
      const event = existingEvent.data;
      
      // Delete/cancel the event
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: meetingId,
        sendUpdates: sendNotification ? 'all' : 'none', 
      });
      
      return JSON.stringify({
        success: true,
        canceled: true,
        meetingDetails: {
          subject: event.summary,
          date: new Date(event.start.dateTime).toLocaleDateString(),
          time: `${new Date(event.start.dateTime).toLocaleTimeString()} - ${new Date(event.end.dateTime).toLocaleTimeString()}`,
          reason: reason,
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error canceling meeting: ${error.message}`,
      });
    }
  },
  {
    name: "cancelMeeting",
    description: "Cancel an existing meeting and notify attendees",
    schema: z.object({
      meetingId: z.string().describe("ID of the meeting to cancel"),
      reason: z.string().optional().describe("Reason for cancellation (optional)"),
      sendNotification: z.boolean().optional().describe("Whether to send cancellation notifications (default: true)"),
    }),
  }
);

// Get upcoming meetings
const getUpcomingMeetings = tool(
  async ({ days = 7, maxResults = 10 }) => {
    try {
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + days);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = response.data.items;
      
      const formattedEvents = events.map(event => {
        const start = new Date(event.start.dateTime || event.start.date);
        const end = new Date(event.end.dateTime || event.end.date);
        
        return {
          id: event.id,
          title: event.summary || 'Untitled Meeting',
          date: start.toLocaleDateString(),
          startTime: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          endTime: end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          location: event.location || (event.hangoutLink ? 'Google Meet' : 'Not specified'),
          videoLink: event.hangoutLink || null,
          attendees: event.attendees ? event.attendees.map(a => ({ email: a.email, name: a.displayName || a.email })) : [],
          description: event.description || '',
        };
      });
      
      return JSON.stringify({
        success: true,
        meetings: formattedEvents,
        timeZone: response.data.timeZone,
        count: formattedEvents.length,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Error retrieving upcoming meetings: ${error.message}`,
      });
    }
  },
  {
    name: "getUpcomingMeetings",
    description: "Retrieve Robin's upcoming meetings for the specified time period",
    schema: z.object({
      days: z.number().optional().describe("Number of days to look ahead (default: 7)"),
      maxResults: z.number().optional().describe("Maximum number of meetings to return (default: 10)"),
    }),
  }
);

// Export all calendar-related tools
export const calendarTools = [
  checkAvailability,
  scheduleMeeting,
  rescheduleMeeting,
  cancelMeeting,
  getUpcomingMeetings,
];

export default calendarTools;