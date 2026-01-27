import { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface TimetableSlot {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  startTime: string; 
  endTime: string;   
  type: 'lecture' | 'lab' | 'tutorial';
}

// Matches your Firestore 'slots' array structure exactly
interface FirestoreSlot {
  subject: string;
  teacherName: string; 
  time: string; // e.g., "09:00"
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const today = new Date();
const currentDayIndex = today.getDay() - 1; 
const currentDay = currentDayIndex >= 0 && currentDayIndex < 5 ? days[currentDayIndex] : 'Monday';

const typeConfig = {
  lecture: { label: 'Lecture', color: 'bg-primary/10 text-primary border-primary/20' },
  lab: { label: 'Lab', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  tutorial: { label: 'Tutorial', color: 'bg-muted text-muted-foreground border-muted' },
};

export default function Timetable() {
  const { userData } = useAuth();
  const [selectedDayIndex, setSelectedDayIndex] = useState(days.indexOf(currentDay));
  const selectedDay = days[selectedDayIndex];
  
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTimetable = async () => {
      // Need Department and Semester to build the Document ID
      if (!userData?.department || !userData?.semester) return;

      setLoading(true);
      try {
        // --- 1. FORMAT SEMESTER ---
        // Your database uses "Sem 2", "Sem 6", etc.
        // User profile might have "Semester 2" or just "2". We standardize it to "Sem X".
        let semString = userData.semester.toString();
        if (semString.toLowerCase().includes('semester')) {
          semString = semString.replace(/semester/i, 'Sem').trim(); // "Semester 2" -> "Sem 2"
        } else if (!semString.toLowerCase().startsWith('sem')) {
          semString = `Sem ${semString}`; // "2" -> "Sem 2"
        }

        // --- 2. CONSTRUCT DOCUMENT ID ---
        // Format: "Mechanical Engineering_Sem 2_Monday"
        const docId = `${userData.department}_${semString}_${selectedDay}`;
        console.log("Fetching Timetable Doc:", docId);

        // --- 3. FETCH DATA ---
        const docRef = doc(db, 'timetables', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const rawSlots = (data.slots || []) as FirestoreSlot[];

          // --- 4. MAP TO UI ---
          const formattedSlots: TimetableSlot[] = rawSlots.map((slot, index) => {
            // Your DB has time as "09:00". We'll assume a 1-hour duration for the UI.
            const start = slot.time || '00:00';
            
            // simple logic to add 1 hour for endTime display
            const [h, m] = start.split(':').map(Number);
            const endH = (h + 1).toString().padStart(2, '0');
            const end = `${endH}:${m?.toString().padStart(2, '0') || '00'}`;

            return {
              id: `${docId}_${index}`,
              subject: slot.subject || 'Unknown Subject',
              teacher: slot.teacherName || 'Unknown Teacher',
              room: 'Classroom', // Not in your slots array, setting default
              startTime: start,
              endTime: end,
              type: 'lecture'
            };
          });

          // Sort by time
          formattedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
          setSchedule(formattedSlots);
        } else {
          setSchedule([]); // No doc found for this day
        }

      } catch (error) {
        console.error("Error fetching timetable:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [selectedDay, userData?.department, userData?.semester]);

  const goToPrevDay = () => setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : 4));
  const goToNextDay = () => setSelectedDayIndex((prev) => (prev < 4 ? prev + 1 : 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
        <p className="text-muted-foreground">
          {userData?.department ? `${userData.department} (${userData.semester})` : 'Weekly Schedule'}
        </p>
      </div>

      {/* Day Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
              {days.map((day, index) => (
                <Button 
                  key={day} 
                  variant={selectedDayIndex === index ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedDayIndex(index)} 
                  className="min-w-[80px]"
                >
                  {day.slice(0, 3)}
                  {day === currentDay && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : schedule.length > 0 ? (
          schedule.map((slot) => {
            const config = typeConfig[slot.type] || typeConfig.lecture;
            
            // Highlight Current Class Logic
            const now = new Date();
            const [startH, startM] = slot.startTime.split(':').map(Number);
            const [endH, endM] = slot.endTime.split(':').map(Number);
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const startMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;
            
            const isLive = (days[days.indexOf(currentDay)] === selectedDay) && 
                           (currentMins >= startMins && currentMins < endMins);

            return (
              <Card key={slot.id} className={`transition-all ${isLive ? 'border-primary shadow-md bg-primary/5' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className={`font-semibold ${isLive ? 'text-primary' : 'text-foreground'}`}>{slot.startTime}</p>
                      <p className="text-xs text-muted-foreground">{slot.endTime}</p>
                    </div>
                    
                    <div className="relative flex flex-col items-center self-stretch">
                       <div className={`w-1 flex-1 rounded-full ${isLive ? 'bg-primary' : 'bg-border'}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{slot.subject}</h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{slot.teacher}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={config.color}>
                          {isLive && <span className="mr-1 animate-pulse">●</span>}
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{slot.room}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
              <Calendar className="h-12 w-12 mb-3 opacity-20" />
              <p>No classes scheduled for {selectedDay}</p>
              
              {(!userData?.department || !userData?.semester) && (
                <div className="mt-4 flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please update your profile with Department & Semester.</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}