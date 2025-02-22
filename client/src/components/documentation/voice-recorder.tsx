import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic, StopCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "./confirmation-dialog";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string, sendToReview: boolean) => void;
  patientContext?: {
    careLevel?: number;
    lastVisit?: Date;
  };
  className?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function VoiceRecorder({ onTranscriptionComplete, patientContext, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [previewText, setPreviewText] = useState<string>("");
  const [editableText, setEditableText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [aiGeneratedText, setAiGeneratedText] = useState<string>("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const { sendMessage, subscribe } = useWebSocket();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'TRANSCRIPTION_COMPLETE':
          setIsProcessing(false);
          setShowConfirmation(true);
          setAiGeneratedText(message.documentation);
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

  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      const updateDuration = () => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        animationFrameRef.current = requestAnimationFrame(updateDuration);
      };
      animationFrameRef.current = requestAnimationFrame(updateDuration);

      // Simulate audio level for visual feedback
      const simulateAudioLevel = () => {
        setAudioLevel(Math.random() * 100);
        setTimeout(simulateAudioLevel, 100);
      };
      simulateAudioLevel();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isRecording]);

  const startRecording = () => {
    try {
      setError("");
      setPreviewText("");
      setEditableText("");
      setAiGeneratedText("");
      setShowConfirmation(false);

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
      audioContent: editableText,
      patientContext: patientContext
    });
  };

  const handleDocumentationConfirm = (text: string, sendToReview: boolean) => {
    onTranscriptionComplete(text, sendToReview);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card className={cn("relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300", className)}>
        <CardContent className="p-6">
          {isRecording ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-500">Aufnahme läuft...</span>
                </div>
                <div className="text-sm font-mono text-muted-foreground">
                  {formatDuration(recordingDuration)}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Progress value={audioLevel} className="h-1" />
                  <Progress value={100} className="h-1 opacity-30" />
                  <Progress value={audioLevel * 0.7} className="h-1 opacity-50" />
                </div>
                <motion.div 
                  className="p-4 bg-muted/30 rounded-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm font-mono whitespace-pre-wrap">
                    {editableText || "Warte auf Spracheingabe..."}
                  </p>
                </motion.div>
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
              className="w-full h-16 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20"
              onClick={startRecording}
              disabled={isProcessing}
            >
              <Mic className="mr-3 h-5 w-5" />
              <span className="font-medium">Sprachaufnahme starten</span>
            </Button>
          )}

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {editableText && !showConfirmation && !isRecording && (
            <motion.div 
              className="mt-6 space-y-4 animate-in fade-in-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Aufgenommener Text:</label>
                <Textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="min-h-[150px] font-mono text-sm leading-relaxed"
                  placeholder="Text bearbeiten..."
                />
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90" 
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                <Brain className="mr-2 h-4 w-4" />
                {isProcessing ? "Verarbeite..." : "Mit KI optimieren"}
              </Button>
            </motion.div>
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