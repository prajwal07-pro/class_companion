import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Bell, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { startContinuousAlarm, stopContinuousAlarm, isAlarmPlaying } from "@/utils/beep";

// Import your already-working Face API setup!
import { loadFaceApiModels, faceapi } from "@/lib/faceApi";

interface FocusState {
  isFocused: boolean;
  status: "loading" | "ready" | "detecting" | "error";
  error?: string;
}

interface FocusDetectionProps {
  onDistractedTooLong?: () => void;
}

const FocusDetection = ({ onDistractedTooLong }: FocusDetectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  
  const distractedTimeRef = useRef<number>(0);
  const focusedTimeRef = useRef<number>(0);
  
  const [alarmActive, setAlarmActive] = useState(false);
  const [focusState, setFocusState] = useState<FocusState>({
    isFocused: false,
    status: "loading",
  });

  useEffect(() => {
    let mounted = true;

    const initializeTracker = async () => {
      try {
        // 1. Start Webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });

        if (!mounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          videoRef.current.onloadedmetadata = async () => {
            videoRef.current?.play();
            
            // 2. Load your unified Face-API models
            await loadFaceApiModels();
            
            if (mounted) {
              setFocusState((prev) => ({ ...prev, status: "ready" }));
              isDetectingRef.current = true;
              startDetection();
            }
          };
        }
      } catch (err) {
        console.error("Tracker init error:", err);
        setFocusState({
          isFocused: false,
          status: "error",
          error: "Camera access denied or hardware issue.",
        });
      }
    };

    initializeTracker();

    return () => {
      mounted = false;
      isDetectingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopContinuousAlarm();
    };
  }, []);

  const startDetection = async () => {
    if (!videoRef.current || !isDetectingRef.current) return;

    try {
      // Use face-api.js to detect if a face is visible in the frame
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      );

      // If detection exists, the student is looking at the screen
      const isFocused = !!detection;

      if (!isFocused) {
        distractedTimeRef.current += 1; 
        focusedTimeRef.current = 0; 
        
        if (distractedTimeRef.current >= 10 && !isAlarmPlaying()) {
          startContinuousAlarm(1200, 400, 300);
          setAlarmActive(true);
          if (onDistractedTooLong) onDistractedTooLong();
        }
      } else {
        distractedTimeRef.current = 0; 
        focusedTimeRef.current += 1; 
        
        if (focusedTimeRef.current >= 2 && isAlarmPlaying()) {
          stopContinuousAlarm();
          setAlarmActive(false);
        }
      }

      setFocusState({
        isFocused,
        status: "detecting",
      });

      // Loop the detection every 1 second
      if (isDetectingRef.current) {
        setTimeout(startDetection, 1000);
      }

    } catch (error) {
      console.error("Face detection loop error:", error);
      // Try to recover the loop if a single frame fails
      if (isDetectingRef.current) {
        setTimeout(startDetection, 1000);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm backdrop-blur-md">
          <Eye className={`h-4 w-4 ${focusState.isFocused ? 'text-green-400' : 'text-red-400'}`} />
          <span className="text-white/80 font-medium">
            {focusState.isFocused ? "Face Tracked" : "Face Lost"}
          </span>
        </div>
        
        {alarmActive && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse shadow-lg">
            <Bell className="h-5 w-5 animate-bounce" />
            <span className="font-bold">REFOCUS!</span>
          </div>
        )}
        
        {focusState.status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
              <p className="text-lg">Loading Face Engine...</p>
            </div>
          </div>
        )}
      </div>

      {focusState.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{focusState.error}</AlertDescription>
        </Alert>
      ) : focusState.status === "detecting" ? (
        <div className="space-y-3">
          {alarmActive && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 flex items-start gap-3 animate-pulse">
              <Bell className="h-6 w-6 text-red-400 mt-0.5 animate-bounce" />
              <div>
                <p className="text-red-400 font-bold text-lg">⚠️ DISTRACTION ALERT!</p>
                <p className="text-sm text-white/90 mt-1">
                  Alarm will stop when you focus for 2 seconds
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/10 border border-white/5">
            <div className="flex items-center gap-3">
              {focusState.isFocused ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                  <div>
                    <span className="font-semibold text-green-400 text-lg">Focused ✓</span>
                    <p className="text-xs text-white/70">
                      Great work tracking the screen!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-yellow-400" />
                  <div>
                    <span className="font-semibold text-yellow-400 text-lg">
                      Distracted
                    </span>
                    <p className="text-xs text-white/70">
                      Please look at the camera
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FocusDetection;