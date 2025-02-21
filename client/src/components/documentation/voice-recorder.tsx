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

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function VoiceRecorder({ onTranscriptionComplete, className }: VoiceRecorderProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { sendMessage, subscribe } = useWebSocket();
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'TRANSCRIPTION_COMPLETE':
          setIsTranscribing(false);
          setTranscriptionProgress(100);
          setPreviewText(message.documentation);
          onTranscriptionComplete(message.documentation);
          break;
        case 'TRANSCRIPTION_ERROR':
          setIsTranscribing(false);
          setTranscriptionProgress(0);
          setError(message.error);
          break;
      }
    });
  }, [subscribe, onTranscriptionComplete]);

  const setupRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Spracherkennung wird in diesem Browser nicht unterstützt");
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ');

        setPreviewText(transcript);
        sendMessage({
          type: 'VOICE_TRANSCRIPTION',
          audioContent: transcript
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = "Fehler bei der Spracherkennung";

        switch (event.error) {
          case 'no-speech':
            errorMessage = "Keine Sprache erkannt. Bitte sprechen Sie deutlich.";
            break;
          case 'audio-capture':
            errorMessage = "Kein Mikrofon gefunden oder Zugriff verweigert.";
            break;
          case 'not-allowed':
            errorMessage = "Zugriff auf das Mikrofon wurde verweigert.";
            break;
          case 'network':
            errorMessage = "Netzwerkfehler bei der Spracherkennung.";
            break;
        }

        setError(errorMessage);
        setIsTranscribing(false);
        setTranscriptionProgress(0);
      };

      setRecognition(recognition);
      return recognition;
    } catch (error) {
      setError("Spracherkennung konnte nicht initialisiert werden");
      return null;
    }
  };

  const {
    status,
    startRecording,
    stopRecording,
  } = useReactMediaRecorder({
    audio: true,
    onStop: () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      if (recognition) {
        recognition.stop();
      }
    },
  });

  const handleStartRecording = () => {
    setError("");
    setRecordingDuration(0);
    setPreviewText("");

    const newRecognition = setupRecognition();
    if (!newRecognition) {
      return;
    }

    setIsTranscribing(true);
    startRecording();
    newRecognition.start();

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
    if (recognition) {
      recognition.stop();
    }
    stopRecording();
    setIsTranscribing(false);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

        {(isTranscribing || previewText || error) && (
          <div className="space-y-2 animate-in fade-in-50">
            {isTranscribing && (
              <>
                <div className="flex items-center justify-between text-sm text-primary">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 animate-pulse" />
                    <span>Spracherkennung aktiv...</span>
                  </div>
                </div>
                <Progress value={transcriptionProgress} className="h-2" />
              </>
            )}
            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            )}
            {previewText && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Erkannter Text:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {previewText}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}