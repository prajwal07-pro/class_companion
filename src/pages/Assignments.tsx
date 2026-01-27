import { useState, useEffect } from 'react';
import { 
  ClipboardList, Calendar, CheckCircle2, Clock, ArrowRight, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose 
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  department: string;
  semester: string;
  teacherName: string;
  dueDate: string;
  createdAt: Timestamp;
  status?: 'pending' | 'submitted'; // Derived status
}

function AssignmentCard({ assignment, onSubmit }: { assignment: Assignment; onSubmit: (id: string) => void }) {
  const dueDateObj = new Date(assignment.dueDate);
  const now = new Date();
  const timeDiff = dueDateObj.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  const isOverdue = daysLeft < 0;
  const isUrgent = !isOverdue && daysLeft <= 2;
  const isSubmitted = assignment.status === 'submitted';

  return (
    <Card className={`transition-all ${isUrgent && !isSubmitted ? 'border-orange-500/50 bg-orange-500/5' : 'hover:shadow-md'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background">{assignment.subject}</Badge>
              {isUrgent && !isSubmitted && <Badge className="bg-orange-500 hover:bg-orange-600 border-transparent text-white">Due Soon</Badge>}
              {isOverdue && !isSubmitted && <Badge variant="destructive">Overdue</Badge>}
            </div>
            <h3 className="font-bold text-lg text-foreground">{assignment.title}</h3>
            <p className="text-xs text-muted-foreground">By {assignment.teacherName}</p>
          </div>
          
          <Badge variant={isSubmitted ? 'default' : 'secondary'} className="flex items-center gap-1">
            {isSubmitted ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {isSubmitted ? 'Completed' : 'Pending'}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {assignment.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className={isOverdue && !isSubmitted ? "text-destructive font-medium" : ""}>
              {dueDateObj.toLocaleDateString()} 
              <span className="text-xs ml-1 opacity-70">
                ({daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? "Today" : `${daysLeft} days left`})
              </span>
            </span>
          </div>

          {!isSubmitted && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  Mark as Done <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Submission</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to mark <strong>{assignment.title}</strong> as completed?
                  </DialogDescription>
                </DialogHeader>
                
                {/* No File Input here, just confirmation */}
                <div className="py-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                   <p>This will move the assignment to your "Completed" tab.</p>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => onSubmit(assignment.id)}>
                    Yes, Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.department || !userData?.semester || !userData?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Format semester (e.g. "2" -> "Sem 2")
    let semString = userData.semester.toString();
    if (!semString.toLowerCase().startsWith('sem')) {
      semString = `Sem ${semString}`;
    }

    // 1. Fetch Assignments
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('department', '==', userData.department),
      where('semester', '==', semString)
    );

    // 2. Fetch User's Submissions (to know what is completed)
    const submissionsQuery = query(
      collection(db, 'submissions'),
      where('userId', '==', userData.id)
    );

    // Listen to Assignments
    const unsubAssignments = onSnapshot(assignmentsQuery, (assSnap) => {
      const fetchedAssignments = assSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      
      // Listen to Submissions
      const unsubSubmissions = onSnapshot(submissionsQuery, (subSnap) => {
        const submittedIds = new Set(subSnap.docs.map(doc => doc.data().assignmentId));
        
        // Merge data: Set status based on submission existence
        const mergedData = fetchedAssignments.map(a => ({
          ...a,
          status: submittedIds.has(a.id) ? 'submitted' : 'pending'
        }));

        // Sort: Pending first, then by Due Date
        mergedData.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        setAssignments(mergedData as Assignment[]);
        setLoading(false);
      });

      return () => unsubSubmissions();
    });

    return () => unsubAssignments();
  }, [userData?.department, userData?.semester, userData?.id]);

  const handleSubmit = async (assignmentId: string) => {
    if (!userData?.id) return;

    try {
      // Create a record in 'submissions' collection
      await addDoc(collection(db, 'submissions'), {
        assignmentId: assignmentId,
        userId: userData.id,
        submittedAt: Timestamp.now(),
        studentName: userData.name || 'Unknown'
      });

      toast({ title: 'Submitted', description: 'Assignment moved to Completed.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not mark as done.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = assignments.filter(a => a.status !== 'submitted');
  const submitted = assignments.filter(a => a.status === 'submitted');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Assignments</h1>
          <p className="text-muted-foreground">
            {userData?.department ? `Tasks for ${userData.department} (${userData.semester})` : 'Your pending work'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold text-primary">{pending.length}</span>
            <span className="text-sm text-muted-foreground">To Do</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold text-green-600">{submitted.length}</span>
            <span className="text-sm text-muted-foreground">Completed</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">To Do ({pending.length})</TabsTrigger>
          <TabsTrigger value="submitted">Completed ({submitted.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pending.length > 0 ? (
            pending.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={handleSubmit} />)
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">All caught up!</h3>
              <p className="text-muted-foreground">No pending assignments.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="submitted" className="mt-4 space-y-4">
          {submitted.length > 0 ? (
             submitted.map(a => <AssignmentCard key={a.id} assignment={a} onSubmit={() => {}} />)
          ) : (
             <div className="text-center py-12 text-muted-foreground">No completed assignments yet.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}