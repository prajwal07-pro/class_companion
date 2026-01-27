import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, User, AlertCircle, RefreshCw, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SignupForm } from '@/components/auth/SignupForm'; 

export default function Auth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { loginWithFace, isFullyAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState("Initializing Face ID...");
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Redirect if already logged in
  useEffect(() => {
    if (isFullyAuthenticated) {
      navigate('/');
    }
  }, [isFullyAuthenticated, navigate]);

  // Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; 
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        if (authMode === 'login') {
          setStatusMessage("Ready to scan.");
          startVideo();
        }
      } catch (e) {
        console.error(e);
        setStatusMessage("Error loading AI models. Check public/models folder.");
      }
    };
    loadModels();
  }, [authMode]);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error(err);
        setStatusMessage("Camera access denied.");
      });
  };

  const handleScan = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setIsScanning(true);
    setScanStatus('scanning');
    setStatusMessage("Scanning database...");

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const success = await loginWithFace(detection.descriptor);
        if (success) {
          setScanStatus('success');
          setStatusMessage("Welcome back!");
          toast({ title: "Login Successful", description: "Identity verified." });
        } else {
          setScanStatus('failed');
          setStatusMessage("Face not found in database.");
        }
      } else {
        setScanStatus('failed');
        setStatusMessage("No face detected.");
      }
    } catch (error) {
      setScanStatus('failed');
      setStatusMessage("Scan error.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSignupSuccess = (userId: string, data: any) => {
    // Navigate to Face Registration page with the user data
    navigate('/auth/register-face', { 
      state: { userId, userData: data } 
    });
  };

  // --- REGISTER VIEW ---
  if (authMode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Enter details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm 
              onSuccess={handleSignupSuccess}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- LOGIN VIEW (CAMERA) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Face Login</CardTitle>
          <CardDescription>Look at the camera to sign in</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-2 border-primary/20 shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              onPlay={() => setStatusMessage(modelsLoaded ? "Ready to scan." : "Loading models...")}
              className="w-full h-full object-cover" 
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-center text-white text-sm">
              {statusMessage}
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg font-semibold" 
            onClick={handleScan}
            disabled={!modelsLoaded || isScanning}
            variant={scanStatus === 'failed' ? 'destructive' : 'default'}
          >
            {isScanning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <User className="mr-2 h-5 w-5" />}
            {isScanning ? "Verifying..." : "Login with Face ID"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            New Student?{" "}
            <Button variant="link" onClick={() => setAuthMode('register')} className="p-0 h-auto font-bold text-primary">
              Register Here
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}