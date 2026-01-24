import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { buildStudentContext, getGroqChatResponse } from '@/lib/ai';
import { useToast } from '@/hooks/use-toast';

interface Message { 
  id: string; 
  role: 'user' | 'assistant' | 'system'; 
  content: string; 
}

const quickReplies = [
  'What classes do I have today?', 
  'Is my attendance low in any subject?', 
  'Do I have any pending assignments?', 
  'Where is Bus-01 right now?'
];

export default function Chat() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemContext, setSystemContext] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat with Context
  useEffect(() => {
    const initChat = async () => {
      if (userData?.id) {
        setIsLoading(true);
        const context = await buildStudentContext(userData.id);
        setSystemContext(context);
        
        setMessages([
          { 
            id: 'init', 
            role: 'assistant', 
            content: `Hello ${userData.name?.split(' ')[0] || 'Student'}! I'm connected to the CampusHub database (Groq Powered). Ask me about your schedule, grades, or buses!` 
          }
        ]);
        setIsLoading(false);
      }
    };

    initChat();
  }, [userData]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare message history for Groq API
      // We explicitly include the 'system' role first, then the recent chat history
      const apiMessages = [
        { role: 'system', content: systemContext },
        ...messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      const responseText = await getGroqChatResponse(apiMessages);
      
      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: responseText 
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      toast({
        title: "AI Error",
        description: "Failed to connect to Groq. Please check your API key.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting to Groq right now. Please try again later." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          Campus AI (Groq)
        </h1>
        <p className="text-muted-foreground">Real-time answers from your campus data</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-primary/10">
        <ScrollArea className="flex-1 p-4 bg-muted/5">
          <div className="space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-none' 
                    : 'bg-card border rounded-bl-none'
                }`}>
                  {m.content}
                </div>

                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-card border p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t">
          {messages.length < 3 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {quickReplies.map(q => (
                <Button 
                  key={q} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sendMessage(q)}
                  className="rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Ask about your classes, attendance, or bus location..." 
              className="flex-1 shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              disabled={isLoading}
            />
            <Button 
              onClick={() => sendMessage(input)} 
              disabled={isLoading || !input.trim()}
              className="shadow-sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}