import { useState, useEffect } from 'react';
import { 
  BookOpen, Clock, Calendar, CheckCircle2, AlertTriangle, 
  TrendingUp, ArrowRight, Loader2, MapPin, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { 
  collection, query, where, getDocs, doc, getDoc, orderBy, limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces for the data we need
interface DashboardStats {
  attendancePct: number;
  pendingAssignments: number;
  totalClassesToday: number;
}

interface LiveClass {
  subject: string;
  room: string;
  time: string;
  teacher: string;
  isActive: boolean;
  status: 'ongoing' | 'upcoming' | 'finished';
}

interface UpcomingAssignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
}

interface LatestEvent {
  id: string;
  title: string;
  type: string;
  date: string;
}

export default function Dashboard() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<DashboardStats>({
    attendancePct: 0,
    pendingAssignments: 0,
    totalClassesToday: 0
  });
  
  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [nextAssignment, setNextAssignment] = useState<UpcomingAssignment | null>(null);
  const [latestEvent, setLatestEvent] = useState<LatestEvent | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.department || !userData?.semester || !userData?.id) return;
      setLoading(true);

      try {
        // --- 1. FETCH ATTENDANCE % ---
        const attQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', userData.id)
        );
        const attSnap = await getDocs(attQuery);
        const totalAtt = attSnap.size;
        const presentAtt = attSnap.docs.filter(d => d.data().status === 'present').length;
        const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

        // --- 2. FETCH LIVE CLASS (Today's Timetable) ---
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        
        let semString = userData.semester.toString();
        if (!semString.toLowerCase().startsWith('sem')) semString = `Sem ${semString}`;
        
        const docId = `${userData.department}_${semString}_${today}`;
        const timetableSnap = await getDoc(doc(db, 'timetables', docId));
        
        let currentClass: LiveClass | null = null;
        let classCount = 0;

        if (timetableSnap.exists()) {
          const slots = timetableSnap.data().slots || [];
          classCount = slots.length;
          
          // Find current/next class
          const now = new Date();
          const currentMins = now.getHours() * 60 + now.getMinutes();

          for (const slot of slots) {
            const [h, m] = slot.time.split(':').map(Number);
            const slotStart = h * 60 + m;
            const slotEnd = slotStart + 60; // Assuming 1 hour classes

            if (currentMins >= slotStart && currentMins < slotEnd) {
              currentClass = {
                subject: slot.subject,
                room: slot.room || 'Classroom',
                time: slot.time,
                teacher: slot.teacherName,
                isActive: slot.isActive !== false,
                status: 'ongoing'
              };
              break;
            } else if (currentMins < slotStart && !currentClass) {
               // Next upcoming class
               currentClass = {
                subject: slot.subject,
                room: slot.room || 'Classroom',
                time: slot.time,
                teacher: slot.teacherName,
                isActive: slot.isActive !== false,
                status: 'upcoming'
              };
            }
          }
        }
        setLiveClass(currentClass);

        // --- 3. FETCH PENDING ASSIGNMENTS ---
        // Get all assignments for this dept/sem
        const assignQuery = query(
          collection(db, 'assignments'),
          where('department', '==', userData.department),
          where('semester', '==', semString)
        );
        const assignSnap = await getDocs(assignQuery);
        
        // Get user's submissions
        const subQuery = query(
          collection(db, 'submissions'),
          where('userId', '==', userData.id)
        );
        const subSnap = await getDocs(subQuery);
        const submittedIds = new Set(subSnap.docs.map(d => d.data().assignmentId));

        // Filter Pending
        const pendingList = assignSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as UpcomingAssignment))
          .filter(a => !submittedIds.has(a.id))
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); // Sort by due date

        setNextAssignment(pendingList[0] || null); // The one due soonest

        // --- 4. FETCH LATEST EVENT ---
        const eventQuery = query(
          collection(db, 'career_hub'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const eventSnap = await getDocs(eventQuery);
        if (!eventSnap.empty) {
          const eData = eventSnap.docs[0].data();
          setLatestEvent({
            id: eventSnap.docs[0].id,
            title: eData.title,
            type: eData.type,
            date: eData.createdAt?.toDate ? eData.createdAt.toDate().toLocaleDateString() : 'Upcoming'
          });
        }

        // --- SET FINAL STATS ---
        setStats({
          attendancePct,
          pendingAssignments: pendingList.length,
          totalClassesToday: classCount
        });

      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto max-w-6xl pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {userData?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="text-muted-foreground">
            {userData?.department} • {userData?.semester}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-1 rounded-full border">
          <Clock className="h-4 w-4 text-primary" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Stat */}
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Attendance
              <TrendingUp className={`h-4 w-4 ${stats.attendancePct >= 75 ? 'text-green-500' : 'text-red-500'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.attendancePct}%</div>
            <Progress value={stats.attendancePct} className="h-2 mt-2" 
               indicatorClassName={stats.attendancePct >= 75 ? "bg-green-500" : "bg-red-500"} 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.attendancePct >= 75 ? "You're doing great!" : "Needs attention!"}
            </p>
          </CardContent>
        </Card>

        {/* Assignments Stat */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Pending Tasks
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingAssignments}</div>
            <p className="text-xs text-muted-foreground mt-1">Assignments due</p>
            <Button variant="link" asChild className="p-0 h-auto text-xs mt-2 text-orange-600">
              <Link to="/assignments">View Assignments &rarr;</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Classes Stat */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex justify-between">
              Today's Schedule
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClassesToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Classes scheduled</p>
            <Button variant="link" asChild className="p-0 h-auto text-xs mt-2 text-blue-600">
              <Link to="/timetable">View Timetable &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LIVE CLASS CARD */}
        <Card className="md:col-span-1 h-full shadow-md border-primary/20">
          <CardHeader className="pb-3 bg-muted/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              {liveClass?.status === 'ongoing' ? 'Happening Now' : 'Up Next'}
            </CardTitle>
            <CardDescription>Your class status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {liveClass ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{liveClass.subject}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" /> {liveClass.time}
                    </p>
                  </div>
                  <Badge variant={liveClass.isActive ? 'default' : 'destructive'}>
                    {liveClass.isActive ? 'Live' : 'Cancelled'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm bg-muted/30 p-3 rounded-lg border">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Room: <strong>{liveClass.room}</strong></span>
                  <span className="text-muted-foreground mx-2">|</span>
                  <span>Teacher: <strong>{liveClass.teacher}</strong></span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                <p>No classes right now.</p>
                <p className="text-xs">You're free for the moment!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ALERTS & EVENTS COLUMN */}
        <div className="space-y-4">
          
          {/* Due Soon */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
            </CardHeader>
            <CardContent>
              {nextAssignment ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{nextAssignment.title}</p>
                    <p className="text-xs text-muted-foreground">{nextAssignment.subject}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                      {new Date(nextAssignment.dueDate).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending assignments.</p>
              )}
            </CardContent>
          </Card>

          {/* Latest Event */}
          <Card className="shadow-sm bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Campus Buzz
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestEvent ? (
                <div>
                  <h4 className="font-bold text-foreground">{latestEvent.title}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary" className="bg-white/50">{latestEvent.type}</Badge>
                    <span className="text-xs text-muted-foreground">{latestEvent.date}</span>
                  </div>
                  <Button variant="link" asChild className="p-0 h-auto text-xs mt-3 text-indigo-600">
                    <Link to="/events">See Details &rarr;</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent events.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}