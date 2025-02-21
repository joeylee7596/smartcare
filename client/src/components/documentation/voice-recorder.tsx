import { useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  className?: string;
}

export function VoiceRecorder({ onTranscriptionComplete, className }: VoiceRecorderProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl: string) => {
      await processRecording(blobUrl);
    },
  });

  const processRecording = async (blobUrl: string) => {
    try {
      setIsTranscribing(true);
      setTranscriptionProgress(0);

      // Simulate AI processing with progress updates
      const interval = setInterval(() => {
        setTranscriptionProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);

      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Example transcribed text with smart formatting
      const transcribedText = `Patientenbesuch durchgeführt:
- Vitalzeichen: Normal
- Medikation: Planmäßig verabreicht
- Allgemeinzustand: Stabil
- Besonderheiten: Keine`;

      onTranscriptionComplete(transcribedText);
    } catch (error) {
      console.error("Error processing recording:", error);
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        {status === "recording" ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={stopRecording}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Aufnahme beenden
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={startRecording}
            disabled={isTranscribing}
          >
            <Mic className="mr-2 h-4 w-4" />
            Sprachaufnahme starten
          </Button>
        )}

        {status === "recording" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            Aufnahme läuft...
          </div>
        )}

        {isTranscribing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Brain className="h-4 w-4 animate-pulse" />
              KI verarbeitet Aufnahme...
            </div>
            <Progress value={transcriptionProgress} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}