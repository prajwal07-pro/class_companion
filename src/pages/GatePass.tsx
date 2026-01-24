import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DoorOpen, Clock, Loader2, Plus, CheckCircle2, XCircle, History } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface GatePassRequest {
  id: string;
  reason: string;
  outTime: Timestamp;
  expectedReturn: Timestamp;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Timestamp;
}

const gatePassSchema = z.object({
  reason: z.string().min(10, 'Please provide a detailed reason'),
  outDate: z.string().min(1, 'Required'),
  outTime: z.string().min(1, 'Required'),
  returnDate: z.string().min(1, 'Required'),
  returnTime: z.string().min(1, 'Required'),
});

function GatePassCard({ request }: { request: GatePassRequest }) {
  const statusColors = { PENDING: 'bg-yellow-500/10 text-yellow-600', APPROVED: 'bg-primary/10 text-primary', REJECTED: 'bg-destructive/10 text-destructive' };
  return (
    <Card className="mb-4"><CardContent className="pt-4"><div className="flex justify-between"><p className="font-medium">{request.reason}</p><Badge className={statusColors[request.status]}>{request.status}</Badge></div><p className="text-xs text-muted-foreground mt-2">Out: {request.outTime.toDate().toLocaleString()}</p></CardContent></Card>
  );
}

export default function GatePass() {
  const [requests, setRequests] = useState<GatePassRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { userData } = useAuth();
  const form = useForm({ resolver: zodResolver(gatePassSchema) });

  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collection(db, 'gate_passes'), where('userId', '==', userData.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GatePassRequest)));
    });
    return () => unsubscribe();
  }, [userData]);

  const onSubmit = async (values: any) => {
    try {
      await addDoc(collection(db, 'gate_passes'), {
        userId: userData?.id,
        reason: values.reason,
        outTime: Timestamp.fromDate(new Date(`${values.outDate}T${values.outTime}`)),
        expectedReturn: Timestamp.fromDate(new Date(`${values.returnDate}T${values.returnTime}`)),
        status: 'PENDING',
        createdAt: Timestamp.now()
      });
      setIsOpen(false);
      form.reset();
      toast({ title: 'Request submitted!' });
    } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between"><h1>Gate Pass</h1><Dialog open={isOpen} onOpenChange={setIsOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Request</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="reason" render={({ field }) => <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="outDate" render={({ field }) => <FormItem><FormLabel>Out Date</FormLabel><Input type="date" {...field} /></FormItem>} /><FormField control={form.control} name="outTime" render={({ field }) => <FormItem><FormLabel>Time</FormLabel><Input type="time" {...field} /></FormItem>} /></div><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="returnDate" render={({ field }) => <FormItem><FormLabel>Return Date</FormLabel><Input type="date" {...field} /></FormItem>} /><FormField control={form.control} name="returnTime" render={({ field }) => <FormItem><FormLabel>Time</FormLabel><Input type="time" {...field} /></FormItem>} /></div><Button type="submit" className="w-full">Submit</Button></form></Form></DialogContent></Dialog></div>
      <Tabs defaultValue="pending"><TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList><TabsContent value="pending">{requests.filter(r => r.status === 'PENDING').map(r => <GatePassCard key={r.id} request={r} />)}</TabsContent><TabsContent value="history">{requests.filter(r => r.status !== 'PENDING').map(r => <GatePassCard key={r.id} request={r} />)}</TabsContent></Tabs>
    </div>
  );
}