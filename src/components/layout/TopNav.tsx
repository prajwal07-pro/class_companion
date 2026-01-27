import { Bell, Search } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TopNavProps {
  title?: string;
}

export function TopNav({ title = 'Dashboard' }: TopNavProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
      <SidebarTrigger className="lg:hidden" />
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      
    </header>
  );
}
