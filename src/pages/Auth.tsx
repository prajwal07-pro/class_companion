import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, User, Lock, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SignupForm } from '@/components/auth/SignupForm'; 
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Auth() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track the media stream so we can stop it later
  const streamRef = useRef<MediaStream | null>(null); 
  
  const { loginWithFace, isFullyAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState("Initializing System...");
  const [authMode, setAuthMode] = useState<'face' | 'login' | 'register'>('face');
  
  // New State for Email Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- 1. CLEANUP FUNCTION (STOPS CAMERA) ---
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isFullyAuthenticated) {
      stopCamera(); // Ensure camera is off before navigating
      navigate('/');
    }
  }, [isFullyAuthenticated, navigate]);

  // Load Models & Manage Camera based on Mode
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
      } catch (e) {
        console.error(e);
        setStatusMessage("System Error: AI Models failed.");
      }
    };
    loadModels();

    // Start Camera ONLY if in Face Mode
    if (authMode === 'face') {
      startVideo();
    } else {
      stopCamera(); // Stop if switching to Register/Email Login
    }

    // Cleanup on unmount
    return () => stopCamera();
  }, [authMode]);

  const startVideo = () => {
    setStatusMessage("Starting camera...");
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then((stream) => {
        streamRef.current = stream; // Save stream reference
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatusMessage("Ready to scan.");
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
    setStatusMessage("Scanning...");

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const success = await loginWithFace(detection.descriptor);
        if (success) {
          setScanStatus('success');
          setStatusMessage("Verified.");
          toast({ title: "Welcome back!", description: "Face ID Verified." });
          stopCamera(); // STOP CAMERA IMMEDIATELY ON SUCCESS
        } else {
          setScanStatus('failed');
          setStatusMessage("Face not recognized.");
        }
      } else {
        setScanStatus('failed');
        setStatusMessage("No face detected. Try again.");
      }
    } catch (error) {
      setScanStatus('failed');
      setStatusMessage("Scan error.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Success", description: "Logged in successfully" });
      navigate('/');
    } catch (error: any) {
      toast({ title: "Error", description: "Invalid email or password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSuccess = (userId: string, data: any) => {
    stopCamera(); // Ensure camera is off
    navigate('/auth/register-face', { state: { userId, userData: data } });
  };

  // --- RENDER VIEWS ---

  // 1. REGISTER
  if (authMode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join Campus Companion</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm onSuccess={handleSignupSuccess} onSwitchToLogin={() => setAuthMode('login')} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. EMAIL LOGIN
  if (authMode === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>Enter credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
               <span className="text-muted-foreground">Or use </span>
               <Button variant="link" onClick={() => setAuthMode('face')} className="p-0 text-primary font-semibold">Face ID</Button>
            </div>
            <div className="mt-2 text-center text-sm">
               <span className="text-muted-foreground">New here? </span>
               <Button variant="link" onClick={() => setAuthMode('register')} className="p-0 text-primary font-semibold">Create Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. FACE LOGIN (Default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Face Login</CardTitle>
          <CardDescription>Look at the camera to verify identity</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-2 border-primary/20 shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-center text-white text-xs font-mono">
              {statusMessage}
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg font-semibold h-12" 
            onClick={handleScan}
            disabled={!modelsLoaded || isScanning}
            variant={scanStatus === 'failed' ? 'destructive' : 'default'}
          >
            {isScanning ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <User className="mr-2 h-5 w-5" />}
            {isScanning ? "Verifying..." : "Authenticate"}
          </Button>

          <div className="flex justify-between items-center text-sm px-2">
             <Button variant="link" onClick={() => setAuthMode('login')} className="text-muted-foreground hover:text-primary">
               Use Password
             </Button>
             <Button variant="link" onClick={() => setAuthMode('register')} className="text-muted-foreground hover:text-primary">
               Register
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}