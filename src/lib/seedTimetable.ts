import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

export const seedTimetable = async () => {
  const batch = writeBatch(db);
  const timetableRef = collection(db, 'timetable');
  const departments = ['Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  console.log("Seeding timetable...");

  // Generate sample data for EACH department
  departments.forEach(dept => {
    days.forEach(day => {
        // Create 3 classes per day for testing
        const classes = [
            { subject: 'Class A', teacher: 'Prof. X', room: '101', startTime: '09:00', endTime: '10:00', type: 'lecture' },
            { subject: 'Lab B', teacher: 'Dr. Y', room: 'Lab 1', startTime: '10:00', endTime: '12:00', type: 'lab' },
            { subject: 'Class C', teacher: 'Prof. Z', room: '202', startTime: '13:00', endTime: '14:00', type: 'lecture' },
        ];

        classes.forEach((c) => {
            const newDoc = doc(timetableRef);
            batch.set(newDoc, {
                ...c,
                dayOfWeek: day,
                department: dept, // THIS is the key field needed for filtering
                subject: `${c.subject} (${dept.split(' ')[0]})` // Just to distinguish
            });
        });
    });
  });

  await batch.commit();
  console.log("Timetable seeded successfully!");
  alert("Timetable data added! You can now check the Timetable page.");
};