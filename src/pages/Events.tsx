import { useState, useEffect } from 'react';
import { MapPin, ExternalLink, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Event { id: string; title: string; type: string; date: Timestamp; venue: string; description: string; eligibility: string; }

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    return onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1>Events & Career Hub</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map(event => (
          <Card key={event.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between mb-2"><Badge variant="outline">{event.type}</Badge><span className="text-xs text-muted-foreground">{event.date.toDate().toLocaleDateString()}</span></div>
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
              <div className="flex gap-3 text-xs text-muted-foreground mb-3"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}</span><span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.eligibility}</span></div>
              <Button size="sm" className="w-full"><ExternalLink className="h-3 w-3 mr-1" />Register</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}