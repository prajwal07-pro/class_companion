import { useState, useEffect } from 'react';
import { ClipboardList, Calendar, Upload, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: Timestamp;
  attachments: string[];
  status: 'pending' | 'submitted' | 'overdue';
  submittedAt?: Timestamp;
  userId: string;
}

function getDaysRemaining(dueDate: Timestamp): string {
  const now = new Date();
  const date = dueDate.toDate();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

function AssignmentCard({ assignment, onSubmit }: { assignment: Assignment; onSubmit: (id: string) => void }) {
  const { toast } = useToast();
  const daysText = getDaysRemaining(assignment.dueDate);
  const isUrgent = assignment.status === 'pending' && assignment.dueDate.toDate().getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const statusConfig = {
    pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
    submitted: { label: 'Submitted', variant: 'default' as const, icon: CheckCircle2 },
    overdue: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle },
  };
  const config = statusConfig[assignment.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card className={isUrgent ? 'border-destructive/50' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1"><Badge variant="outline">{assignment.subject}</Badge>{isUrgent && <Badge variant="destructive">Urgent</Badge>}</div>
            <h3 className="font-semibold text-foreground">{assignment.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
          </div>
          <Badge variant={config.variant} className="ml-4"><StatusIcon className="h-3 w-3 mr-1" />{config.label}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{assignment.dueDate.toDate().toLocaleDateString()}</span></div>
          <div className={`flex items-center gap-1 ${assignment.status === 'overdue' ? 'text-destructive' : ''}`}><Clock className="h-3 w-3" /><span>{daysText}</span></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {assignment.attachments?.map((file, index) => (
              <Button key={index} variant="outline" size="sm" onClick={() => toast({ title: 'Downloading...', description: file })}><Download className="h-3 w-3 mr-1" />{file.length > 15 ? file.slice(0, 12) + '...' : file}</Button>
            ))}
          </div>
          {assignment.status === 'pending' && (
            <Dialog>
              <DialogTrigger asChild><Button size="sm"><Upload className="h-3 w-3 mr-1" />Submit</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Submit Assignment</DialogTitle><DialogDescription>{assignment.title}</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div><Label htmlFor="file">Upload your work</Label><Input id="file" type="file" className="mt-2" /></div><Button className="w-full" onClick={() => onSubmit(assignment.id)}><Upload className="h-4 w-4 mr-2" />Submit Assignment</Button></div></DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const { toast } = useToast();
  const { userData } = useAuth();

  useEffect(() => {
    if(!userData?.id) return;
    const q = query(collection(db, 'assignments'), where('userId', '==', userData.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
    });
    return () => unsubscribe();
  }, [userData]);

  const handleSubmit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'assignments', id), { status: 'submitted', submittedAt: Timestamp.now() });
      toast({ title: 'Assignment submitted!', description: 'Your work has been uploaded successfully.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to submit assignment', variant: 'destructive' });
    }
  };

  const pending = assignments.filter(a => a.status === 'pending');
  const submitted = assignments.filter(a => a.status === 'submitted');
  const overdue = assignments.filter(a => a.status === 'overdue');

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground">Assignment Hub</h1><p className="text-muted-foreground">View and submit your assignments</p></div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" /><div className="text-2xl font-bold">{pending.length}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4 text-center"><CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-primary" /><div className="text-2xl font-bold text-primary">{submitted.length}</div><p className="text-xs text-muted-foreground">Submitted</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardContent className="pt-4 text-center"><AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" /><div className="text-2xl font-bold text-destructive">{overdue.length}</div><p className="text-xs text-muted-foreground">Overdue</p></CardContent></Card>
      </div>
      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="submitted">Submitted</TabsTrigger><TabsTrigger value="overdue">Overdue</TabsTrigger></TabsList>
        <TabsContent value="all" className="mt-4 space-y-4">{assignments.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} />)}</TabsContent>
        <TabsContent value="pending" className="mt-4 space-y-4">{pending.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} />)}</TabsContent>
        <TabsContent value="submitted" className="mt-4 space-y-4">{submitted.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} />)}</TabsContent>
        <TabsContent value="overdue" className="mt-4 space-y-4">{overdue.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} />)}</TabsContent>
      </Tabs>
    </div>
  );
}