import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// This function takes a userId so it can link personal data (attendance, assignments) to your specific account
export const seedDatabase = async (userId: string) => {
  const batch = writeBatch(db);
  console.log("Starting seed for user:", userId);

  // --- 1. Classes Collection ---
  // Public data: Everyone sees the same class schedule status
  const classesRef = collection(db, 'classes');
  const classData = [
    { subject: 'Data Structures', teacher: 'Dr. Smith', room: '301', status: 'ON', timeSlot: '09:00 - 10:00', dayOfWeek: 'Monday' },
    { subject: 'Database Systems', teacher: 'Prof. Johnson', room: 'Lab 102', status: 'ON', timeSlot: '10:00 - 11:30', dayOfWeek: 'Monday' },
    { subject: 'Computer Networks', teacher: 'Dr. Williams', room: '205', status: 'OFF', timeSlot: '11:30 - 12:30', dayOfWeek: 'Monday' },
    { subject: 'Software Engineering', teacher: 'Prof. Brown', room: '401', status: 'SUBSTITUTE', substituteTeacher: 'Dr. Davis', timeSlot: '02:00 - 03:00', dayOfWeek: 'Monday' },
    { subject: 'Web Development', teacher: 'Dr. Miller', room: 'Lab 201', status: 'ON', timeSlot: '03:30 - 05:00', dayOfWeek: 'Monday' },
    { subject: 'Operating Systems', teacher: 'Prof. Wilson', room: '302', status: 'ON', timeSlot: '09:00 - 10:30', dayOfWeek: 'Tuesday' },
  ];
  classData.forEach(data => {
    const newDoc = doc(classesRef); 
    batch.set(newDoc, data);
  });

  // --- 2. Attendance Collection ---
  // Private data: Linked to your specific userId
  const attendanceRef = collection(db, 'attendance');
  const attendanceData = [
    { userId, subjectName: 'Data Structures', present: 27, total: 30, percentage: 90, zone: 'green' },
    { userId, subjectName: 'Database Systems', present: 25, total: 32, percentage: 78, zone: 'yellow' },
    { userId, subjectName: 'Computer Networks', present: 21, total: 29, percentage: 72, zone: 'red' },
    { userId, subjectName: 'Software Engineering', present: 26, total: 30, percentage: 87, zone: 'green' },
    { userId, subjectName: 'Web Development', present: 24, total: 28, percentage: 86, zone: 'green' },
  ];
  attendanceData.forEach(data => {
    const newDoc = doc(attendanceRef);
    batch.set(newDoc, { ...data, lastUpdated: Timestamp.now() });
  });

  // --- 3. Timetable Collection ---
  // Public data: General schedule
  const timetableRef = collection(db, 'timetable');
  const timetableData = [
    { subject: 'Data Structures', teacher: 'Dr. Smith', room: '301', startTime: '09:00', endTime: '10:00', type: 'lecture', dayOfWeek: 'Monday' },
    { subject: 'Database Systems', teacher: 'Prof. Johnson', room: 'Lab 102', startTime: '10:00', endTime: '11:30', type: 'lab', dayOfWeek: 'Monday' },
    { subject: 'Computer Networks', teacher: 'Dr. Williams', room: '205', startTime: '11:30', endTime: '12:30', type: 'lecture', dayOfWeek: 'Monday' },
    { subject: 'Operating Systems', teacher: 'Prof. Wilson', room: '302', startTime: '09:00', endTime: '10:30', type: 'lecture', dayOfWeek: 'Tuesday' },
  ];
  timetableData.forEach(data => {
    const newDoc = doc(timetableRef);
    batch.set(newDoc, data);
  });

  // --- 4. Assignments Collection ---
  // Private data: Your assignments
  const assignmentsRef = collection(db, 'assignments');
  const assignmentData = [
    {
      title: 'Binary Tree Implementation',
      subject: 'Data Structures',
      description: 'Implement a binary search tree with insert, delete, and search operations.',
      dueDate: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // Due in 2 days
      attachments: ['assignment_spec.pdf'],
      status: 'pending',
      userId
    },
    {
      title: 'Database Design Project',
      subject: 'Database Systems',
      description: 'Design a normalized database schema for an e-commerce application.',
      dueDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // Due in 5 days
      attachments: ['requirements.pdf'],
      status: 'pending',
      userId
    },
     {
      title: 'Network Protocol Analysis',
      subject: 'Computer Networks',
      description: 'Analyze TCP handshake using Wireshark.',
      dueDate: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // Overdue by 1 day
      attachments: ['protocol_guide.pdf'],
      status: 'overdue',
      userId
    }
  ];
  assignmentData.forEach(data => {
    const newDoc = doc(assignmentsRef);
    batch.set(newDoc, data);
  });

  // --- 5. Bus Tracking Collection ---
  // Public data
  const busesRef = collection(db, 'buses');
  const busData = [
    { busNumber: 'BUS-01', route: 'Main Gate → Hostel Block A', currentLocation: { lat: 12.9716, lng: 77.5946 }, status: 'MOVING', eta: '5 mins', driver: 'John D.' },
    { busNumber: 'BUS-02', route: 'Library → Sports Complex', currentLocation: { lat: 12.9736, lng: 77.5966 }, status: 'STOPPED', eta: '10 mins', driver: 'Mike S.' },
    { busNumber: 'BUS-03', route: 'Cafeteria → Academic Block', currentLocation: { lat: 12.9696, lng: 77.5926 }, status: 'MOVING', eta: '3 mins', driver: 'Tom K.' },
  ];
  busData.forEach(data => {
    const newDoc = doc(busesRef);
    batch.set(newDoc, data);
  });

  // --- 6. Events Collection ---
  // Public data
  const eventsRef = collection(db, 'events');
  const eventData = [
    { title: 'HackFest 2024', type: 'hackathon', date: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), venue: 'Main Auditorium', description: '24-hour coding marathon', eligibility: 'All students' },
    { title: 'AI/ML Workshop', type: 'workshop', date: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), venue: 'Lab 201', description: 'Introduction to Machine Learning', eligibility: '3rd year+' },
    { title: 'TechFest 2024', type: 'techfest', date: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), venue: 'Campus Wide', description: 'Annual technical festival', eligibility: 'All students' },
  ];
  eventData.forEach(data => {
    const newDoc = doc(eventsRef);
    batch.set(newDoc, data);
  });

  // --- 7. Announcements Collection ---
  // Public data
  const announcementsRef = collection(db, 'announcements');
  const announceData = [
    { title: 'Mid-semester exams schedule released', content: 'Exams will begin from March 15th. Check the portal for detailed schedule.', priority: 'urgent', createdAt: Timestamp.now() },
    { title: 'Workshop on AI/ML this Saturday', content: 'Free workshop for all students. Register before Friday.', priority: 'normal', createdAt: Timestamp.now() },
    { title: 'Campus maintenance scheduled', content: 'Power shutdown on Sunday from 6 AM to 12 PM.', priority: 'urgent', createdAt: Timestamp.now() },
  ];
  announceData.forEach(data => {
    const newDoc = doc(announcementsRef);
    batch.set(newDoc, data);
  });

  await batch.commit();
  return "Database seeded successfully!";
};