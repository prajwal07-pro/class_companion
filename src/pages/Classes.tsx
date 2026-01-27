import { useState, useEffect } from 'react';
import { BookOpen, Users, MapPin, Clock, CalendarX, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { doc, onSnapshot } from 'firebase/firestore'; // Using onSnapshot for real-time status updates
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Structure matches your Firestore 'slots' array
interface ClassItem {
  id: string;
  subject: string;
  teacherName: string;
  time: string;
  isActive: boolean; // Field from your database
  room?: string;     // Optional fallback
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ClassCard({ classItem }: { classItem: ClassItem }) {
  // Logic: isActive = true (Green/ON), isActive = false (Red/Cancelled)
  const isCancelled = !classItem.isActive;

  const statusConfig = {
    ON: { 
      label: 'Scheduled', 
      variant: 'default' as const, 
      bg: 'bg-primary/10 border-primary/20',
      text: 'text-primary'
    },
    OFF: { 
      label: 'Cancelled', 
      variant: 'destructive' as const, 
      bg: 'bg-destructive/10 border-destructive/20',
      text: 'text-destructive'
    },
  };

  const status = isCancelled ? statusConfig.OFF : statusConfig.ON;

  // Formatting time for display (e.g. "09:00" -> "09:00 - 10:00")
  const [h, m] = classItem.time.split(':');
  const endTime = h ? `${parseInt(h) + 1}:${m || '00'}` : '';
  const timeDisplay = `${classItem.time} - ${endTime}`;

  return (
    <Card className={`${status.bg} border transition-all hover:shadow-md`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`font-semibold text-lg ${isCancelled ? 'text-muted-foreground line-through decoration-destructive' : 'text-foreground'}`}>
              {classItem.subject}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{classItem.teacherName}</span>
            </div>
          </div>
          <Badge variant={status.variant} className="ml-2">
            {status.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
          <div className="flex items-center gap-1">
             {/* Default room to 'Classroom' since it's not in your slots array yet */}
            <MapPin className="h-3 w-3" />
            <span>{classItem.room || 'Classroom'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeDisplay}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Classes() {
  const { userData } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get Today's Day Name
  const today = days[new Date().getDay()];

  useEffect(() => {
    // Need Department and Semester to build the Document ID
    if (!userData?.department || !userData?.semester) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // --- 1. FORMAT SEMESTER ---
    // Handle "2" vs "Sem 2" vs "Semester 2"
    let semString = userData.semester.toString();
    if (semString.toLowerCase().includes('semester')) {
      semString = semString.replace(/semester/i, 'Sem').trim();
    } else if (!semString.toLowerCase().startsWith('sem')) {
      semString = `Sem ${semString}`;
    }

    // --- 2. CONSTRUCT DOCUMENT ID ---
    // Format: "Mechanical Engineering_Sem 2_Tuesday"
    const docId = `${userData.department}_${semString}_${today}`;
    console.log("Listening to Live Classes:", docId);

    // --- 3. LISTEN TO LIVE DATA ---
    // We use onSnapshot instead of getDoc so status changes (isActive) reflect instantly
    const unsubscribe = onSnapshot(doc(db, 'timetables', docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawSlots = (data.slots || []) as any[];

        const mappedClasses = rawSlots.map((slot, index) => ({
          id: `${docId}_${index}`,
          subject: slot.subject || 'Unknown Subject',
          teacherName: slot.teacherName || 'Unknown',
          time: slot.time || '00:00',
          isActive: slot.isActive !== false, // Default to true if missing, explicitly false if cancelled
          room: slot.room || 'TBA'
        }));

        // Sort by time
        mappedClasses.sort((a, b) => a.time.localeCompare(b.time));
        setClasses(mappedClasses);
      } else {
        setClasses([]); // No classes for today
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live classes:", error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();

  }, [userData?.department, userData?.semester, today]);

  // Statistics for the dashboard cards
  const stats = {
    total: classes.length,
    ongoing: classes.filter(c => c.isActive).length,
    cancelled: classes.filter(c => !c.isActive).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Class Status</h1>
          <p className="text-muted-foreground">
            {today}'s Schedule for {userData?.department}
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 text-sm bg-background">
          {today}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Classes</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.ongoing}</div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.cancelled}</div>
            <p className="text-sm text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Class List */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center flex flex-col items-center justify-center">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-20" />
              <h3 className="text-lg font-medium">No classes today</h3>
              <p className="text-muted-foreground">Enjoy your free time!</p>
              
              {(!userData?.department) && (
                <p className="text-xs text-yellow-600 mt-2 bg-yellow-50 px-2 py-1 rounded">
                  (Check if your Department/Semester is set in Profile)
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}