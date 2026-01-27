import { useState } from 'react';
import { User, Mail, Hash, Building2, GraduationCap, LogOut, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { seedDatabase } from '@/lib/seed';
import { useToast } from '@/hooks/use-toast';
import { seedTimetable } from '@/lib/seedTimetable';

export default function Profile() {
  const { userData, logout } = useAuth();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (!userData?.id) return;
    try {
      setSeeding(true);
      const msg = await seedDatabase(userData.id);
      toast({ title: "Success", description: msg });
    } catch (error) {
      toast({ title: "Error", description: "Failed to seed data", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">Profile</h1><p className="text-muted-foreground">Your account information</p></div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userData?.profilePhoto} />
              <AvatarFallback className="text-2xl">{userData?.name?.charAt(0) || 'S'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">{userData?.name || 'Student'}</h2>
              <p className="text-muted-foreground">{userData?.department || 'Department'}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: Mail, label: 'Email', value: userData?.email },
              { icon: Hash, label: 'Student ID', value: userData?.studentId },
              { icon: Building2, label: 'Department', value: userData?.department },
              { icon: GraduationCap, label: 'Semester', value: userData?.semester ? `Semester ${userData.semester}` : undefined },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-medium">{item.value || '---'}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-4">
        <Button onClick={seedTimetable}>Fix Timetable Data</Button>

        <Button variant="destructive" className="flex-1" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}