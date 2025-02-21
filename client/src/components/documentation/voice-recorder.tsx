import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle, Brain, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { Textarea } from "@/components/ui/textarea";

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
  const [editableText, setEditableText] = useState<string>("");
  const [finalDocumentation, setFinalDocumentation] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendMessage, subscribe } = useWebSocket();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'TRANSCRIPTION_COMPLETE':
          setIsProcessing(false);
          setFinalDocumentation(message.documentation);
          onTranscriptionComplete(message.documentation);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          break;
        case 'TRANSCRIPTION_ERROR':
          setIsProcessing(false);
          setError(message.error);
          break;
      }
    });
  }, [subscribe, onTranscriptionComplete]);

  const startRecording = () => {
    try {
      setError("");
      setPreviewText("");
      setEditableText("");
      setFinalDocumentation("");

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
        setEditableText(transcript);
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

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      setError(error instanceof Error ? error.message : "Spracherkennung konnte nicht initialisiert werden");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    sendMessage({
      type: 'VOICE_TRANSCRIPTION',
      audioContent: editableText
    });
  };

  return (
    <Card className={cn("relative overflow-hidden hover:shadow-lg transition-all duration-300", className)}>
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
            className="w-full hover:bg-primary/5"
            onClick={startRecording}
            disabled={isProcessing}
          >
            <Mic className="mr-2 h-4 w-4" />
            Sprachaufnahme starten
          </Button>
        )}

        {(isRecording || editableText || error || finalDocumentation) && (
          <div className="space-y-4 animate-in fade-in-50">
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
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            )}

            {editableText && !finalDocumentation && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Erkannter Text:</p>
                <Textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="min-h-[100px] bg-muted/50"
                  placeholder="Text bearbeiten..."
                />
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  onClick={handleConfirm}
                  disabled={isProcessing}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isProcessing ? "Verarbeite..." : "Text bestätigen"}
                </Button>
              </div>
            )}

            {finalDocumentation && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-blue-700" />
                  <p className="text-sm font-medium text-blue-700">KI-Dokumentation:</p>
                </div>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">
                  {finalDocumentation}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}