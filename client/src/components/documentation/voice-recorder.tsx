import { useState, useEffect } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  className?: string;
}

export function VoiceRecorder({ onTranscriptionComplete, className }: VoiceRecorderProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const { sendMessage, subscribe } = useWebSocket();

  useEffect(() => {
    subscribe((message) => {
      if (message.type === 'TRANSCRIPTION_RESULT') {
        setIsTranscribing(false);
        setTranscriptionProgress(100);
        onTranscriptionComplete(message.documentation);
      } else if (message.type === 'TRANSCRIPTION_PROGRESS') {
        setPreviewText(message.preview || "");
        setTranscriptionProgress(Math.min(95, transcriptionProgress + 5));
      }
    });
  }, [subscribe, onTranscriptionComplete, transcriptionProgress]);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl: string) => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      await processRecording(blobUrl);
    },
  });

  const handleStartRecording = () => {
    setRecordingDuration(0);
    setPreviewText("");
    startRecording();
    const interval = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    setRecordingInterval(interval);
  };

  const handleStopRecording = () => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    stopRecording();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const processRecording = async (blobUrl: string) => {
    try {
      setIsTranscribing(true);
      setTranscriptionProgress(0);

      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio) {
          sendMessage({
            type: 'VOICE_TRANSCRIPTION',
            audioContent: base64Audio,
          });
        }
      };

      reader.readAsDataURL(blob);

    } catch (error) {
      console.error("Error processing recording:", error);
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4 space-y-4">
        {status === "recording" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-sm font-medium">Aufnahme läuft...</span>
              </div>
              <span className="text-sm font-medium">{formatDuration(recordingDuration)}</span>
            </div>
            {previewText && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-muted-foreground">{previewText}</p>
              </div>
            )}
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleStopRecording}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Aufnahme beenden
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleStartRecording}
            disabled={isTranscribing}
          >
            <Mic className="mr-2 h-4 w-4" />
            Sprachaufnahme starten
          </Button>
        )}

        {isTranscribing && (
          <div className="space-y-2 animate-in fade-in-50">
            <div className="flex items-center justify-between text-sm text-primary">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 animate-pulse" />
                <span>KI verarbeitet Aufnahme...</span>
              </div>
              <span>{transcriptionProgress}%</span>
            </div>
            <Progress value={transcriptionProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Ihre Aufnahme wird transkribiert und intelligent formatiert...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}