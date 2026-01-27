import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Mic, MicOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import { Groq } from 'groq-sdk';

// Initialize Groq
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY, 
  dangerouslyAllowBrowser: true 
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat() {
  const { userData } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hello ${userData?.name?.split(' ')[0] || 'Student'}! I'm your Campus Assistant. I have full access to the database. Ask me about schedules, assignments, or events!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dbContext, setDbContext] = useState("");

  // --- 1. SETUP SPEECH RECOGNITION ---
  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one sentence/phrase
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // --- 2. FETCH DATABASE CONTEXT ---
  useEffect(() => {
    const fetchDatabaseContext = async () => {
      try {
        const assignSnap = await getDocs(collection(db, 'assignments'));
        const assignments = assignSnap.docs.map(d => 
          `- Assignment: ${d.data().title} (${d.data().subject}) due ${d.data().dueDate}`
        ).join('\n');

        const eventSnap = await getDocs(collection(db, 'career_hub')); 
        const events = eventSnap.docs.map(d => 
          `- Event: ${d.data().title} (${d.data().type}) on ${d.data().createdAt?.toDate ? d.data().createdAt.toDate().toDateString() : 'TBA'}`
        ).join('\n');

        const contextString = `
          You are an advanced Campus AI Assistant powered by Gemini.
          [ASSIGNMENTS]
          ${assignments || "No active assignments."}
          [EVENTS]
          ${events || "No upcoming events."}
          [USER INFO]
          Name: ${userData?.name}
          ID: ${userData?.studentId}
          Dept: ${userData?.department}
          Sem: ${userData?.semester}
          
          INSTRUCTIONS:
          You have ADMIN-LEVEL access. Answer accurately based on the data above.
        `;
        
        setDbContext(contextString);
      } catch (error) {
        console.error("Error loading AI context:", error);
      }
    };

    if (userData) fetchDatabaseContext();
  }, [userData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = [
        { role: 'system', content: dbContext }, 
        ...messages.map(m => ({ role: m.role, content: m.content })), 
        { role: 'user', content: input } 
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: conversationHistory as any,
        // UPDATED MODEL HERE:
        model: 'llama-3.3-70b-versatile', 
        temperature: 0.5,
        max_tokens: 1024,
      });

      const aiResponse = chatCompletion.choices[0]?.message?.content || "I couldn't process that.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble accessing the server right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col container mx-auto max-w-4xl py-4">
      <Card className="flex-1 flex flex-col border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-500 p-2.5 rounded-lg shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Gemini Assistant
                <Badge variant="secondary" className="text-xs font-normal bg-blue-500/10 text-blue-600 border-blue-200">
                  Database Connected
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                Powered by Google Gemini • Full Campus Access
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/50">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border bg-background shadow-sm">
                      <AvatarImage src="/bot-avatar.png" />
                      <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-white dark:bg-slate-900 border rounded-tl-sm'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 border bg-background shadow-sm">
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Analyzing database...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="p-4 border-t bg-background">
          <div className="max-w-3xl mx-auto relative flex items-center gap-2">
            
            {/* Input Field Wrapper */}
            <div className="relative flex-1">
              <Input
                placeholder="Type or speak your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="pr-12 py-6 text-base shadow-sm border-muted-foreground/20 focus-visible:ring-primary pl-4"
              />
              
              {/* --- MIC BUTTON --- */}
              <Button 
                onClick={toggleListening}
                variant="ghost"
                size="icon"
                className={`absolute right-2 top-1.5 h-9 w-9 transition-all duration-300 ${
                  isListening 
                    ? 'text-red-500 hover:text-red-600 bg-red-50 animate-pulse' 
                    : 'text-muted-foreground hover:text-primary'
                }`}
                title="Use Voice Input"
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !isListening)}
              size="icon"
              className="h-12 w-12 rounded-xl shadow-md shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-center mt-2">
             <p className="text-[10px] text-muted-foreground">
               AI has access to Assignments, Events, and User Profile.
             </p>
          </div>
        </div>
      </Card>
    </div>
  );
}