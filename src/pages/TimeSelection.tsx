import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonitorPlay, Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TimeSelection = () => {
  const navigate = useNavigate();
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const presetDurations = [15, 25, 45, 60, 90];

  const handleStartFocus = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      stream.getTracks().forEach((track) => track.stop());
      setShowPermissionDialog(false);

      navigate(`/focus-mode?duration=${selectedDuration}&screenGranted=true`);
    } catch (err) {
      console.error("Screen share permission denied:", err);
      navigate(`/focus-mode?duration=${selectedDuration}&screenGranted=false`);
    }
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setCustomDuration("");
    setShowPermissionDialog(true);
  };

  const handleCustomDurationSubmit = () => {
    const duration = parseInt(customDuration);
    if (duration > 0) {
      setSelectedDuration(duration);
      setShowPermissionDialog(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md p-6 space-y-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Focus Setup</h1>
          <p className="text-muted-foreground">
            Choose your focus duration to begin the session.
          </p>
        </div>

        <div className="space-y-4">
          <Label>Preset Durations</Label>
          <div className="grid grid-cols-3 gap-3">
            {presetDurations.map((duration) => (
              <Button
                key={duration}
                variant={selectedDuration === duration ? "default" : "outline"}
                onClick={() => handleDurationSelect(duration)}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Clock className="w-5 h-5" />
                <span>{duration} min</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Custom Duration (minutes)</Label>
          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="e.g. 45"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              min="1"
            />
            <Button onClick={handleCustomDurationSubmit} variant="secondary">
              Set
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorPlay className="w-5 h-5 text-primary" />
              Screen Monitoring Setup
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              <span>To track your study activity, we need permission to view your screen. Please select the screen or window you plan to study on.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2 mt-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              If you deny permission, the session will still start, but screen activity tracking will be disabled.
            </span>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartFocus}>Allow & Start</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeSelection;