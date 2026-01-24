import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadFaceApiModels, extractFaceDescriptor } from '@/lib/faceApi';
import { useToast } from '@/hooks/use-toast';

interface FaceCaptureProps {
  onCapture: (descriptor: Float32Array, photoDataUrl: string) => void;
  isRegistration?: boolean;
}

export function FaceCapture({ onCapture, isRegistration = false }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Load face-api models
      await loadFaceApiModels();
      
      // Start camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Failed to access camera');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
    try {
      const descriptor = await extractFaceDescriptor(videoRef.current);
      
      if (!descriptor) {
        toast({
          title: 'No face detected',
          description: 'Please position your face clearly in the frame',
          variant: 'destructive',
        });
        setIsCapturing(false);
        return;
      }

      // Capture photo
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      setIsCaptured(true);
      
      toast({
        title: 'Face captured successfully!',
        description: isRegistration 
          ? 'Your face data has been recorded' 
          : 'Verifying your identity...',
      });

      onCapture(descriptor, photoDataUrl);
    } catch (err: any) {
      console.error('Capture error:', err);
      toast({
        title: 'Capture failed',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const resetCapture = () => {
    setIsCaptured(false);
    startCamera();
  };

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Camera className="h-12 w-12 text-destructive" />
            </div>
            <p className="text-destructive">{error}</p>
            <Button onClick={startCamera}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Camera className="h-5 w-5" />
          {isRegistration ? 'Register Your Face' : 'Face Verification'}
        </CardTitle>
        <CardDescription>
          {isRegistration
            ? 'Position your face in the frame and capture your photo'
            : 'Look at the camera to verify your identity'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading camera...</p>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          
          {/* Face guide overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-60 border-2 border-dashed border-primary/50 rounded-[50%]" />
            </div>
          </div>

          {isCaptured && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="font-medium text-foreground">Face Captured!</p>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex gap-2">
          {isCaptured ? (
            <Button variant="outline" className="flex-1" onClick={resetCapture}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake
            </Button>
          ) : (
            <Button 
              className="flex-1" 
              onClick={captureAndAnalyze}
              disabled={isLoading || isCapturing}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Face
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
