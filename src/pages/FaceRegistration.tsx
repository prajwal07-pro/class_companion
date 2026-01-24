import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaceCapture } from '@/components/auth/FaceCapture';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function FaceRegistration() {
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, createUserProfile, setFaceVerified } = useAuth();
  const { toast } = useToast();

  const stateData = location.state as { userId?: string; userData?: any } | null;
  const userId = stateData?.userId || firebaseUser?.uid;
  const userData = stateData?.userData;

  const handleFaceCapture = async (descriptor: Float32Array, photoDataUrl: string) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User session not found. Please sign up again.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    try {
      // Create user profile with face data
      await createUserProfile(userId, {
        ...userData,
        email: userData?.email || firebaseUser?.email || '',
        faceDescriptor: Array.from(descriptor),
        profilePhoto: photoDataUrl,
      });

      setIsComplete(true);
      setFaceVerified(true);
      
      toast({
        title: 'Registration complete!',
        description: 'Your face has been registered successfully.',
      });

      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Face registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">All Set!</h2>
              <p className="text-muted-foreground">
                Your account is ready. Redirecting to dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary mb-4">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Almost There!</h1>
          <p className="text-muted-foreground mt-1">
            Register your face for secure login
          </p>
        </div>

        {/* Face Capture */}
        <FaceCapture onCapture={handleFaceCapture} isRegistration />

        {/* Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Why Face ID?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Secure, password-less verification</p>
            <p>• Only you can access your account</p>
            <p>• Required for every login</p>
            <p>• Your data is encrypted and stored securely</p>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate('/auth')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </div>
    </div>
  );
}
