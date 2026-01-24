import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Announcement { id: string; title: string; content: string; priority: 'normal' | 'urgent'; createdAt: Timestamp; }

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  useEffect(() => {
    return onSnapshot(collection(db, 'announcements'), (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1>Announcements</h1>
      <div className="space-y-4">
        {announcements.map(a => (
          <Card key={a.id} className={a.priority === 'urgent' ? 'border-destructive/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex justify-between mb-2"><div className="flex items-center gap-2">{a.priority === 'urgent' && <AlertTriangle className="h-4 w-4 text-destructive" />}<h3 className="font-semibold">{a.title}</h3></div>{a.priority === 'urgent' && <Badge variant="destructive">Urgent</Badge>}</div>
              <p className="text-sm text-muted-foreground mb-2">{a.content}</p>
              <p className="text-xs text-muted-foreground">{a.createdAt.toDate().toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}