import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TimetableSlot {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
  type: 'lecture' | 'lab' | 'tutorial';
  dayOfWeek: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const today = new Date();
const currentDayIndex = today.getDay() - 1; 

const typeConfig = {
  lecture: { label: 'Lecture', color: 'bg-primary/10 text-primary border-primary/20' },
  lab: { label: 'Lab', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  tutorial: { label: 'Tutorial', color: 'bg-muted text-muted-foreground border-muted' },
};

export default function Timetable() {
  const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex >= 0 && currentDayIndex < 5 ? currentDayIndex : 0);
  const selectedDay = days[selectedDayIndex];
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);

  useEffect(() => {
    const fetchTimetable = async () => {
      const q = query(collection(db, 'timetable'), where('dayOfWeek', '==', selectedDay));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableSlot));
      data.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setSchedule(data);
    };
    fetchTimetable();
  }, [selectedDay]);

  const goToPrevDay = () => setSelectedDayIndex((prev) => (prev > 0 ? prev - 1 : 4));
  const goToNextDay = () => setSelectedDayIndex((prev) => (prev < 4 ? prev + 1 : 0));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Timetable</h1><p className="text-muted-foreground">Your weekly class schedule</p></div>
      <Card><CardContent className="py-4"><div className="flex items-center justify-between"><Button variant="ghost" size="icon" onClick={goToPrevDay}><ChevronLeft className="h-5 w-5" /></Button><div className="flex gap-2 overflow-x-auto">{days.map((day, index) => (<Button key={day} variant={selectedDayIndex === index ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedDayIndex(index)} className="min-w-[80px]">{day.slice(0, 3)}</Button>))}</div><Button variant="ghost" size="icon" onClick={goToNextDay}><ChevronRight className="h-5 w-5" /></Button></div></CardContent></Card>
      <div className="space-y-3">
        {schedule.length > 0 ? schedule.map((slot) => {
            const config = typeConfig[slot.type] || typeConfig.lecture;
            return (
              <Card key={slot.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]"><p className="font-semibold text-foreground">{slot.startTime}</p><p className="text-xs text-muted-foreground">{slot.endTime}</p></div>
                    <div className="relative"><div className={`h-full w-1 rounded-full bg-border`} /></div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2"><div><h3 className="font-semibold text-foreground">{slot.subject}</h3><div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3 w-3" /><span>{slot.teacher}</span></div></div><Badge variant="outline" className={config.color}>{config.label}</Badge></div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" /><span>{slot.room}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }) : <Card><CardContent className="py-8 text-center"><Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No classes scheduled for {selectedDay}</p></CardContent></Card>}
      </div>
    </div>
  );
}