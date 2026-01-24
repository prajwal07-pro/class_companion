import { collection, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// 1. Fetch all context data from Firestore for the specific user
export const buildStudentContext = async (userId: string) => {
  try {
    // A. Fetch User Profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : null;

    // B. Fetch Today's Classes
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const today = days[new Date().getDay() - 1] || 'Monday';
    const classesSnap = await getDocs(query(collection(db, 'classes'), where('dayOfWeek', '==', today)));
    const classes = classesSnap.docs.map(d => {
        const data = d.data();
        return `- ${data.subject} (${data.timeSlot}) in ${data.room} [Status: ${data.status}]`;
    });

    // C. Fetch Attendance
    const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('userId', '==', userId)));
    const attendance = attendanceSnap.docs.map(d => {
        const data = d.data();
        return `- ${data.subjectName}: ${data.percentage}% (${data.zone} zone)`;
    });

    // D. Fetch Pending Assignments
    const assignSnap = await getDocs(query(collection(db, 'assignments'), where('userId', '==', userId), where('status', '==', 'pending')));
    const assignments = assignSnap.docs.map(d => {
        const data = d.data();
        const date = data.dueDate instanceof Timestamp ? data.dueDate.toDate().toDateString() : 'No Date';
        return `- ${data.title} (${data.subject}) - Due: ${date}`;
    });

    // E. Fetch Bus Status
    const busSnap = await getDocs(collection(db, 'buses'));
    const buses = busSnap.docs.map(d => {
        const data = d.data();
        return `- ${data.busNumber} (${data.route}) is ${data.status} at ${data.eta}`;
    });

    // F. Fetch Announcements
    const announceSnap = await getDocs(collection(db, 'announcements'));
    const announcements = announceSnap.docs.map(d => `- ${d.data().title}: ${d.data().content}`);

    // G. Fetch Events
    const eventsSnap = await getDocs(collection(db, 'events'));
    const events = eventsSnap.docs.map(d => {
        const data = d.data();
        const date = data.date instanceof Timestamp ? data.date.toDate().toDateString() : 'TBA';
        return `- ${data.title} (${data.type}) on ${date} at ${data.venue}`;
    });

    // H. Construct the System Prompt
    return `
      You are an intelligent Campus Assistant for a student named ${userData?.name || 'Student'}.
      You have access to the real-time campus database. Here is the current status:

      --- LIVE CAMPUS DATA ---
      Date/Day: ${new Date().toDateString()} (${today})
      
      STUDENT DETAILS:
      Name: ${userData?.name} | ID: ${userData?.studentId} | Dept: ${userData?.department}

      TODAY'S CLASSES:
      ${classes.length > 0 ? classes.join('\n') : "No classes scheduled today."}

      ATTENDANCE:
      ${attendance.length > 0 ? attendance.join('\n') : "No attendance records found."}

      PENDING ASSIGNMENTS:
      ${assignments.length > 0 ? assignments.join('\n') : "No pending assignments."}

      BUS LIVE STATUS:
      ${buses.length > 0 ? buses.join('\n') : "No bus tracking info available."}

      ANNOUNCEMENTS:
      ${announcements.length > 0 ? announcements.join('\n') : "No new announcements."}

      UPCOMING EVENTS:
      ${events.length > 0 ? events.join('\n') : "No upcoming events."}
      -----------------------

      INSTRUCTIONS:
      1. Answer questions based strictly on the data above.
      2. Keep answers concise, friendly, and helpful.
      3. If the user asks something not in the data, say you don't have that information.
    `;

  } catch (error) {
    console.error("Error building context:", error);
    return "You are a helpful assistant. I could not fetch the latest data from the database, so please ask the user for details.";
  }
};

// 2. Call Groq API
export const getGroqChatResponse = async (messages: { role: string, content: string }[]) => {
  if (!GROQ_API_KEY) {
    throw new Error("Missing VITE_GROQ_API_KEY in .env file");
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
        model: "llama-3.3-70b-versatile", // UPDATED: Replaced deprecated model
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I'm not sure how to answer that.";
  } catch (error) {
    console.error("Groq API Call Failed:", error);
    throw error;
  }
};