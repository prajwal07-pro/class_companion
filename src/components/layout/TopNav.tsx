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

      <div className="hidden md:flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9"
          />
        </div>
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          3
        </Badge>
      </Button>
    </header>
  );
}
