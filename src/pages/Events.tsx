import { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, User, ArrowUpRight, LinkIcon, Loader2, 
  Info, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, getDocs, Timestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Define the structure based on your screenshot
interface CareerHubEvent {
  id: string;
  title: string;        
  content: string;      
  imageUrl?: string;    
  createdAt: Timestamp; 
  postedBy: string;      // UPDATED: Matches your DB field 'postedBy'
  type: string;         
  links?: string[];     
  location?: string;    
}

export default function Events() {
  const [events, setEvents] = useState<CareerHubEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        console.log("Fetching events from 'career_hub'...");
        
        // UPDATED: Correct collection name is 'career_hub' (with underscore)
        const q = query(collection(db, 'career_hub'), orderBy('createdAt', 'desc'));
        
        const snapshot = await getDocs(q);
        
        const fetchedEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CareerHubEvent));
        
        console.log(`Found ${fetchedEvents.length} events.`);
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'Date TBA';
    // Handle potential conversion errors if timestamp is missing
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getTypeColor = (type: string) => {
    // Safety check in case type is undefined
    const t = (type || '').toLowerCase();
    if (t.includes('hackathon')) return 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20';
    if (t.includes('workshop')) return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20';
    if (t.includes('seminar')) return 'bg-green-500/10 text-green-600 hover:bg-green-500/20';
    return 'bg-primary/10 text-primary hover:bg-primary/20';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading upcoming events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto max-w-5xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-primary" />
          Campus Events
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover workshops, hackathons, and seminars happening on campus.
        </p>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col overflow-hidden border-muted/60 shadow-sm hover:shadow-md transition-all duration-200 group">
              
              {/* Event Image */}
              {event.imageUrl && (
                <div className="relative w-full h-48 overflow-hidden bg-muted">
                  <img 
                    src={event.imageUrl} 
                    alt={event.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'; 
                      (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className={`font-medium backdrop-blur-md ${getTypeColor(event.type)}`}>
                      {event.type}
                    </Badge>
                  </div>
                </div>
              )}

              <CardHeader className={`${event.imageUrl ? 'pt-4' : 'pt-6'} pb-2`}>
                {!event.imageUrl && (
                  <div className="mb-2">
                    <Badge variant="outline" className={getTypeColor(event.type)}>
                      {event.type}
                    </Badge>
                  </div>
                )}
                <h2 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {event.title}
                </h2>
              </CardHeader>
              
              <CardContent className="flex-1 pb-4 space-y-4">
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {/* UPDATED: Using 'postedBy' */}
                    <span>By {event.postedBy}</span>
                  </div>
                </div>

                <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                  {event.content}
                </p>
              </CardContent>

              <CardFooter className="pt-0 border-t bg-muted/5 flex flex-wrap gap-2 p-4">
                {event.links && event.links.length > 0 ? (
                  event.links.map((link, index) => (
                    <Button key={index} asChild size="sm" className="gap-1 shadow-sm">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        {link.includes('forms') || link.includes('register') ? 'Register Now' : 'View Details'}
                        <ArrowUpRight className="h-4 w-4 ml-0.5" />
                      </a>
                    </Button>
                  ))
                ) : (
                  <Button variant="outline" size="sm" disabled className="opacity-70">
                    <Info className="h-4 w-4 mr-1.5" /> Info Only
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
               <CalendarDays className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold">No upcoming events</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Check back later for new workshops, seminars, and campus activities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}