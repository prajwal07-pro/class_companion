import { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message { id: string; text: string; isBot: boolean; }

const quickReplies = ['What\'s my attendance?', 'When is the next exam?', 'Show my timetable', 'Library hours?'];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! I\'m your CampusHub AI assistant. How can I help you today?', isBot: true }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text, isBot: false }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: 'Thanks for your question! This feature will be connected to AI soon. For now, please check the relevant section in the app.', isBot: true }]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">AI Chat Assistant</h1>
        <p className="text-muted-foreground">Ask me anything about campus</p>
      </div>

      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.isBot ? '' : 'justify-end'}`}>
                {m.isBot && <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>}
                <div className={`max-w-[70%] p-3 rounded-lg ${m.isBot ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                  <p className="text-sm">{m.text}</p>
                </div>
                {!m.isBot && <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center"><User className="h-4 w-4 text-primary-foreground" /></div>}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReplies.map(q => <Button key={q} variant="outline" size="sm" onClick={() => sendMessage(q)}>{q}</Button>)}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)} />
            <Button onClick={() => sendMessage(input)}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
