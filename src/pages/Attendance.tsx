import { useState, useEffect } from 'react';
import { 
  CalendarDays, CheckCircle2, XCircle, PieChart, Loader2, AlertTriangle, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Structure matches your Firestore 'attendance' document
interface AttendanceRecord {
  id: string;
  className: string;      // e.g. "Mechanical Engineering - Sem 2"
  date: string;           // e.g. "2026-01-27T11:02:25.418Z"
  department: string;     // e.g. "Mechanical Engineering"
  semester: string;       // e.g. "2"
  status: 'present' | 'absent';
  studentId: string;      // Matches userData.id
  studentName: string;
}

export default function Attendance() {
  const { userData } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistics State
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0
  });

  useEffect(() => {
    // We need the logged-in user's ID to fetch their specific records
    if (!userData?.id) return;

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        console.log(`Fetching attendance for Student ID: ${userData.id}...`);

        // Query: Get all docs from 'attendance' collection where studentId matches
        const q = query(
          collection(db, 'attendance'),
          where('studentId', '==', userData.id)
          // Note: If you have an index error, remove orderBy and sort manually in JS
        );

        const snapshot = await getDocs(q);
        
        const fetchedRecords = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord));

        // Sort by Date (Newest first) manually to avoid Firestore index issues
        fetchedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecords(fetchedRecords);

        // Calculate Stats
        const total = fetchedRecords.length;
        const present = fetchedRecords.filter(r => r.status.toLowerCase() === 'present').length;
        const absent = total - present;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        setStats({ total, present, absent, percentage });

      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [userData?.id]);

  // Determine Color for Progress Bar
  const getProgressColor = (pct: number) => {
    if (pct >= 75) return "bg-green-500";
    if (pct >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <PieChart className="h-8 w-8 text-primary" />
          Attendance Tracker
        </h1>
        <p className="text-muted-foreground text-lg">
          Track your daily attendance and maintain your eligibility.
        </p>
      </div>

      {/* --- 1. STATISTICS CARDS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Percentage Card */}
        <Card className="col-span-2 lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{stats.percentage}%</div>
            <Progress 
              value={stats.percentage} 
              className="h-2 mt-3 bg-primary/20" 
              indicatorClassName={getProgressColor(stats.percentage)} 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.percentage < 75 ? (
                <span className="text-red-500 flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3 w-3" /> Low Attendance
                </span>
              ) : (
                <span className="text-green-600 flex items-center gap-1 font-medium">
                  <TrendingUp className="h-3 w-3" /> Good Standing
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Present Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Classes Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold">{stats.present}</div>
            </div>
          </CardContent>
        </Card>

        {/* Absent Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Classes Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div className="text-2xl font-bold">{stats.absent}</div>
            </div>
          </CardContent>
        </Card>

        {/* Total Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded Sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* --- 2. ATTENDANCE HISTORY LIST --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record) => {
                const dateObj = new Date(record.date);
                const isPresent = record.status.toLowerCase() === 'present';

                return (
                  <div 
                    key={record.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Box */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-muted rounded-md border text-center">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-foreground">
                          {dateObj.getDate()}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div>
                        <h4 className="font-semibold text-foreground">{record.className}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>{dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>{record.department}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge 
                      variant="outline" 
                      className={`px-3 py-1 flex items-center gap-1.5 ${
                        isPresent 
                          ? 'bg-green-500/10 text-green-600 border-green-200' 
                          : 'bg-red-500/10 text-red-600 border-red-200'
                      }`}
                    >
                      {isPresent ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {isPresent ? "Present" : "Absent"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No attendance records found yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}