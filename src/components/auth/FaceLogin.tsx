import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FaceCapture } from './FaceCapture';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FaceLoginProps {
  onBack: () => void;
}

export function FaceLogin({ onBack }: FaceLoginProps) {
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const { verifyFace, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFaceCapture = async (descriptor: Float32Array) => {
    const isMatch = await verifyFace(descriptor);
    
    if (isMatch) {
      setVerificationStatus('success');
      toast({
        title: 'Welcome back!',
        description: `Identity verified. Hello, ${userData?.name}!`,
      });
      
      // Short delay before navigating
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setVerificationStatus('failed');
      toast({
        title: 'Verification failed',
        description: 'Face does not match. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (verificationStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Identity Verified!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verificationStatus === 'failed') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle>Verification Failed</CardTitle>
          <CardDescription>
            The captured face doesn't match your registered face
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full" 
            onClick={() => setVerificationStatus('pending')}
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <FaceCapture onCapture={handleFaceCapture} />
    </div>
  );
}
