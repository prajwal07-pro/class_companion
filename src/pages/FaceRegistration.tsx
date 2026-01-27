import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function FaceRegistration() {
  const { state } = useLocation();
  const { createUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);

  // If no state (user tried to access directly), go back to auth
  useEffect(() => {
    if (!state?.userId || !state?.userData) {
      navigate('/auth');
    }
  }, [state, navigate]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      startVideo();
    };
    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; });
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    
    const detection = await faceapi.detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      // Create full profile with face data
      const descriptorArray = Array.from(detection.descriptor);
      
      await createUserProfile(state.userId, {
        ...state.userData,
        faceDescriptor: descriptorArray
      });

      toast({ title: "Registration Complete!", description: "Your face ID is set up." });
      navigate('/');
    } else {
      toast({ title: "No Face Detected", variant: "destructive" });
    }
    setScanning(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Face ID</CardTitle>
          <CardDescription>One last step to secure your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border bg-black aspect-video">
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
          </div>
          <Button onClick={handleCapture} disabled={!modelsLoaded || scanning} className="w-full">
            {scanning ? "Processing..." : "Capture & Finish"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}