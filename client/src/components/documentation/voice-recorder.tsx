import { useState, useEffect } from "react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [previewText, setPreviewText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { sendMessage, subscribe } = useWebSocket();
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'TRANSCRIPTION_COMPLETE':
          setPreviewText(message.documentation);
          onTranscriptionComplete(message.documentation);
          break;
        case 'TRANSCRIPTION_ERROR':
          setError(message.error);
          break;
      }
    });
  }, [subscribe, onTranscriptionComplete]);

  const startRecording = () => {
    try {
      setError("");
      setPreviewText("");

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Spracherkennung wird in diesem Browser nicht unterstützt");
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

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
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognition);
      recognition.start();

    } catch (error) {
      setError(error instanceof Error ? error.message : "Spracherkennung konnte nicht initialisiert werden");
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsRecording(false);
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4 space-y-4">
        {isRecording ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                <span className="text-sm font-medium">Aufnahme läuft...</span>
              </div>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={stopRecording}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Aufnahme beenden
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={startRecording}
          >
            <Mic className="mr-2 h-4 w-4" />
            Sprachaufnahme starten
          </Button>
        )}

        {(isRecording || previewText || error) && (
          <div className="space-y-2 animate-in fade-in-50">
            {isRecording && (
              <>
                <div className="flex items-center justify-between text-sm text-primary">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 animate-pulse" />
                    <span>Spracherkennung aktiv...</span>
                  </div>
                </div>
                <Progress value={100} className="h-2" />
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