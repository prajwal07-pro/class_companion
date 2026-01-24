import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { FaceLogin } from '@/components/auth/FaceLogin';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'signup' | 'face-verify';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const navigate = useNavigate();
  const { firebaseUser, userData, isFullyAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isFullyAuthenticated) {
      navigate('/');
    }
  }, [isFullyAuthenticated, navigate]);

  // After email/password login, check if user has face data
  useEffect(() => {
    if (firebaseUser && userData && mode === 'login') {
      if (userData.faceDescriptor && userData.faceDescriptor.length > 0) {
        // User has face registered, go to face verification
        setMode('face-verify');
      } else {
        // User hasn't registered face yet, redirect to face registration
        navigate('/auth/register-face');
      }
    }
  }, [firebaseUser, userData, mode, navigate]);

  const handleLoginSuccess = () => {
    // Will be handled by useEffect above
  };

  const handleSignupSuccess = (userId: string, data: any) => {
    setPendingUserId(userId);
    setPendingUserData(data);
    // Navigate to face registration
    navigate('/auth/register-face', { 
      state: { userId, userData: data } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">CampusHub</h1>
          <p className="text-muted-foreground mt-1">Your complete campus companion</p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardContent className="pt-6">
            {mode === 'login' && (
              <LoginForm
                onSuccess={handleLoginSuccess}
                onSwitchToSignup={() => setMode('signup')}
              />
            )}
            
            {mode === 'signup' && (
              <SignupForm
                onSuccess={handleSignupSuccess}
                onSwitchToLogin={() => setMode('login')}
              />
            )}
            
            {mode === 'face-verify' && (
              <FaceLogin onBack={() => setMode('login')} />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Secure dual authentication with Face ID
        </p>
      </div>
    </div>
  );
}
