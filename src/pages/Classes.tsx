import { useState, useEffect } from 'react';
import { BookOpen, Users, MapPin, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ClassItem {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  status: 'ON' | 'OFF' | 'SUBSTITUTE';
  substituteTeacher?: string;
  timeSlot: string;
  dayOfWeek: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const currentDay = days[new Date().getDay() - 1] || 'Monday';

function ClassCard({ classItem }: { classItem: ClassItem }) {
  const statusConfig = {
    ON: { label: 'Ongoing', variant: 'default' as const, bg: 'bg-primary/10 border-primary/20' },
    OFF: { label: 'Cancelled', variant: 'destructive' as const, bg: 'bg-destructive/10 border-destructive/20' },
    SUBSTITUTE: { label: 'Substitute', variant: 'secondary' as const, bg: 'bg-yellow-500/10 border-yellow-500/20' },
  };

  const status = statusConfig[classItem.status] || statusConfig.ON;

  return (
    <Card className={`${status.bg} border`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground">{classItem.subject}</h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{classItem.teacher}</span>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>Room {classItem.room}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{classItem.timeSlot}</span>
          </div>
        </div>
        {classItem.status === 'SUBSTITUTE' && classItem.substituteTeacher && (
          <div className="mt-2 p-2 bg-background/50 rounded-md">
            <p className="text-xs text-muted-foreground"><span className="font-medium">Substitute:</span> {classItem.substituteTeacher}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Classes() {
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'classes'), where('dayOfWeek', '==', selectedDay));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassItem));
      setClasses(fetchedClasses);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedDay]);

  const stats = {
    total: classes.length,
    ongoing: classes.filter(c => c.status === 'ON').length,
    cancelled: classes.filter(c => c.status === 'OFF').length,
    substitute: classes.filter(c => c.status === 'SUBSTITUTE').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Live Class Status</h1><p className="text-muted-foreground">Check if your classes are on before heading out</p></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-foreground">{stats.total}</div><p className="text-sm text-muted-foreground">Total Classes</p></CardContent></Card>
        <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">{stats.ongoing}</div><p className="text-sm text-muted-foreground">Ongoing</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardContent className="pt-4"><div className="text-2xl font-bold text-destructive">{stats.cancelled}</div><p className="text-sm text-muted-foreground">Cancelled</p></CardContent></Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5"><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.substitute}</div><p className="text-sm text-muted-foreground">Substitute</p></CardContent></Card>
      </div>
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {days.map((day) => (
            <TabsTrigger key={day} value={day} className="min-w-[80px]">{day.slice(0, 3)}{day === currentDay && <span className="ml-1 text-xs">(Today)</span>}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={selectedDay} className="mt-4">
          {loading ? <div className="text-center py-8">Loading classes...</div> : classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((classItem) => <ClassCard key={classItem.id} classItem={classItem} />)}
            </div>
          ) : (
            <Card><CardContent className="py-8 text-center"><BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No classes scheduled for {selectedDay}</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}