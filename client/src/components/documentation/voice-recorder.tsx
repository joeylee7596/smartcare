import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "./confirmation-dialog";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string, sendToReview: boolean) => void;
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
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [aiGeneratedText, setAiGeneratedText] = useState<string>("");
  const { sendMessage, subscribe } = useWebSocket();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'TRANSCRIPTION_COMPLETE':
          setIsProcessing(false);
          setAiGeneratedText(message.documentation);
          setShowConfirmation(true);
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
  }, [subscribe]);

  const startRecording = () => {
    try {
      setError("");
      setPreviewText("");
      setEditableText("");
      setAiGeneratedText("");

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

  const handleDocumentationConfirm = (text: string, sendToReview: boolean) => {
    onTranscriptionComplete(text, sendToReview);
  };

  return (
    <>
      <Card className={cn("relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>
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
              className="w-full bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20"
              onClick={startRecording}
              disabled={isProcessing}
            >
              <Mic className="mr-2 h-4 w-4" />
              Sprachaufnahme starten
            </Button>
          )}

          {(isRecording || editableText || error) && (
            <div className="space-y-4 animate-in fade-in-50">
              {isRecording && (
                <>
                  <div className="flex items-center justify-between text-sm text-primary">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 animate-pulse" />
                      <span>Spracherkennung aktiv...</span>
                    </div>
                  </div>
                  <Progress value={100} className="h-1.5" />
                </>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {editableText && !showConfirmation && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Erkannter Text:</p>
                  <Textarea
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    className="min-h-[100px] bg-muted/50 font-mono text-sm"
                    placeholder="Text bearbeiten..."
                  />
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    onClick={handleConfirm}
                    disabled={isProcessing}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    {isProcessing ? "Verarbeite..." : "Mit KI optimieren"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        documentation={aiGeneratedText}
        onConfirm={handleDocumentationConfirm}
      />
    </>
  );
}