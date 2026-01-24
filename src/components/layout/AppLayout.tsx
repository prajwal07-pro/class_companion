import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  title?: string;
}

export function AppLayout({ title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <TopNav title={title} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </main>
          <MobileNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
