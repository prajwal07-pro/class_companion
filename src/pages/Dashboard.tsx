import { useEffect, useState } from 'react';
import { BookOpen, ClipboardList, Calendar, Bell, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Dashboard() {
  const { userData } = useAuth();
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({ classes: 0, attendance: 0, assignments: 0, announcements: 0 });

  useEffect(() => {
    if (!userData?.id) return;
    const fetchData = async () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const today = days[new Date().getDay() - 1] || 'Monday';

      // Classes
      const classesSnap = await getDocs(query(collection(db, 'classes'), where('dayOfWeek', '==', today)));
      setTodayClasses(classesSnap.docs.map(d => d.data()));
      
      // Attendance
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('userId', '==', userData.id)));
      const attData = attSnap.docs.map(d => d.data());
      setAttendance(attData);
      const avgAtt = attData.length ? Math.round(attData.reduce((acc, curr: any) => acc + curr.percentage, 0) / attData.length) : 0;

      // Assignments
      const assignSnap = await getDocs(query(collection(db, 'assignments'), where('userId', '==', userData.id), where('status', '==', 'pending')));
      
      // Announcements
      const annSnap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3)));
      setAnnouncements(annSnap.docs.map(d => d.data()));

      setStats({
        classes: classesSnap.size,
        attendance: avgAtt,
        assignments: assignSnap.size,
        announcements: annSnap.size
      });
    };
    fetchData();
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2"><h1 className="text-2xl font-bold text-foreground">Welcome back, {userData?.name?.split(' ')[0] || 'Student'}! 👋</h1></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Today's Classes</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.classes}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle><ClipboardList className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.attendance}%</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Assignments</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.assignments}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Announcements</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.announcements}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Today's Schedule</CardTitle></CardHeader><CardContent><div className="space-y-3">{todayClasses.map((item, i) => (<div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"><div className="text-sm font-medium w-20">{item.timeSlot?.split('-')[0]}</div><div><p className="font-medium">{item.subject}</p><p className="text-sm text-muted-foreground">{item.room}</p></div></div>))}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Attendance Overview</CardTitle></CardHeader><CardContent><div className="space-y-4">{attendance.map((item, i) => (<div key={i}><div className="flex justify-between mb-1"><span className="text-sm font-medium">{item.subjectName}</span><span className="text-sm font-bold">{item.percentage}%</span></div><Progress value={item.percentage} className="h-2" /></div>))}</div></CardContent></Card>
      </div>
    </div>
  );
}