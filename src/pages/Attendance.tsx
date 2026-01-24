import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceData {
  id: string;
  subjectName: string;
  present: number;
  total: number;
  percentage: number;
  zone: 'green' | 'yellow' | 'red';
}

const zoneConfig = {
  green: { label: 'Safe Zone', icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', progressClass: '' },
  yellow: { label: 'Warning Zone', icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-500/10 border-yellow-500/20', progressClass: '[&>div]:bg-yellow-500' },
  red: { label: 'Danger Zone', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', progressClass: '[&>div]:bg-destructive' },
};

function SubjectCard({ data }: { data: AttendanceData }) {
  const zone = zoneConfig[data.zone] || zoneConfig.green;
  const ZoneIcon = zone.icon;
  const classesToAttend = data.zone === 'red' ? Math.ceil((0.75 * (data.total + 5) - data.present)) : 0;

  return (
    <Card className={`${zone.bg} border`}>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between">
          <div><h3 className="font-semibold text-foreground">{data.subjectName}</h3><p className="text-sm text-muted-foreground">{data.present}/{data.total} classes attended</p></div>
          <Badge variant={data.zone === 'green' ? 'default' : data.zone === 'yellow' ? 'secondary' : 'destructive'}><ZoneIcon className="h-3 w-3 mr-1" />{zone.label}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Attendance</span><span className={`font-bold ${zone.color}`}>{data.percentage}%</span></div>
          <Progress value={data.percentage} className={`h-3 ${zone.progressClass}`} />
        </div>
        {data.zone === 'red' && <div className="p-2 bg-background/50 rounded-md"><p className="text-xs text-destructive font-medium">⚠️ Attend next {classesToAttend} classes to reach 75%</p></div>}
      </CardContent>
    </Card>
  );
}

export default function Attendance() {
  const { userData } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);

  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collection(db, 'attendance'), where('userId', '==', userData.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceData));
      setAttendanceData(data);
    });
    return () => unsubscribe();
  }, [userData]);

  const overallAttendance = attendanceData.length > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.percentage, 0) / attendanceData.length)
    : 0;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Attendance Monitor</h1><p className="text-muted-foreground">Track your attendance across all subjects</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2"><CardContent className="pt-4"><div className="flex items-center gap-4"><div className={`h-16 w-16 rounded-full flex items-center justify-center ${overallAttendance >= 85 ? 'bg-primary/10' : overallAttendance >= 75 ? 'bg-yellow-500/10' : 'bg-destructive/10'}`}><span className={`text-2xl font-bold ${overallAttendance >= 85 ? 'text-primary' : overallAttendance >= 75 ? 'text-yellow-600' : 'text-destructive'}`}>{overallAttendance}%</span></div><div><h3 className="font-semibold text-foreground">Overall Attendance</h3><p className="text-sm text-muted-foreground">{overallAttendance >= 75 ? 'You are meeting the minimum requirement' : 'Below minimum requirement!'}</p></div></div></CardContent></Card>
      </div>
      <div><h2 className="text-lg font-semibold mb-4">Subject-wise Breakdown</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{attendanceData.map((data) => <SubjectCard key={data.id} data={data} />)}</div></div>
    </div>
  );
}