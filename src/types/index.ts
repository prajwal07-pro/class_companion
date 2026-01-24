import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  name: string;
  studentId: string;
  department: string;
  semester: number;
  faceDescriptor: number[];
  profilePhoto: string;
  createdAt: Timestamp;
}

export interface Class {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  status: 'ON' | 'OFF' | 'SUBSTITUTE';
  substituteTeacher?: string;
  timeSlot: string;
  dayOfWeek: string;
}

export interface Attendance {
  id: string;
  userId: string;
  subjectId: string;
  date: Timestamp;
  status: 'present' | 'absent';
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: Timestamp;
  attachments: string[];
  submissions: Submission[];
}

export interface Submission {
  userId: string;
  fileUrl: string;
  submittedAt: Timestamp;
}

export interface Bus {
  id: string;
  busNumber: string;
  route: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  status: 'MOVING' | 'STOPPED';
  eta: string;
}

export interface GatePass {
  id: string;
  userId: string;
  reason: string;
  outTime: Timestamp;
  expectedReturn: Timestamp;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: Timestamp;
}

export interface Event {
  id: string;
  title: string;
  type: 'hackathon' | 'workshop' | 'techfest' | 'placement';
  date: Timestamp;
  venue: string;
  description: string;
  eligibility?: string;
  registrationUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  createdAt: Timestamp;
}

export interface Complaint {
  id: string;
  userId: string;
  category: 'infrastructure' | 'academic' | 'ragging' | 'other';
  description: string;
  status: 'submitted' | 'in-review' | 'resolved';
  createdAt: Timestamp;
  isAnonymous: boolean;
}

export interface AttendanceStats {
  subjectId: string;
  subjectName: string;
  present: number;
  total: number;
  percentage: number;
  zone: 'green' | 'yellow' | 'red';
}

export interface TimetableSlot {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
}
