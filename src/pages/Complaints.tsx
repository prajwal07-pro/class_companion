import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const schema = z.object({ category: z.string().min(1), description: z.string().min(20), isAnonymous: z.boolean() });

export default function Complaints() {
  const { toast } = useToast();
  const { userData } = useAuth();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { category: '', description: '', isAnonymous: false } });

  const onSubmit = async (values: any) => {
    try {
      await addDoc(collection(db, 'complaints'), {
        userId: values.isAnonymous ? 'anonymous' : userData?.id,
        ...values,
        status: 'submitted',
        createdAt: Timestamp.now()
      });
      toast({ title: 'Complaint submitted', description: 'We will review your complaint soon.' });
      form.reset();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to submit complaint', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <h1>Complaint Box</h1>
      <Card>
        <CardHeader><CardTitle>Submit a Complaint</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"><FormField control={form.control} name="category" render={({ field }) => <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent><SelectItem value="infrastructure">Infrastructure</SelectItem><SelectItem value="academic">Academic</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></FormItem>} /><FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} /><FormField control={form.control} name="isAnonymous" render={({ field }) => <FormItem className="flex justify-between items-center border p-3 rounded-lg"><div className="space-y-0.5"><FormLabel>Anonymous</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} /><Button type="submit" className="w-full">Submit</Button></form></Form>
        </CardContent>
      </Card>
    </div>
  );
}