import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  FileText,
  Save,
  RefreshCw,
  Check,
  AlertTriangle,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import type { Documentation, Patient } from "@shared/schema";

interface DocumentationEditorProps {
  initialContent?: string;
  patientId: number;
  onSave?: (doc: Documentation) => void;
  shiftId?: number;
}

interface GeminiSuggestion {
  content: string;
  confidence: number;
  type: "completion" | "correction" | "insight";
}

export function DocumentationEditor({
  initialContent = "",
  patientId,
  onSave,
  shiftId,
}: DocumentationEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [docType, setDocType] = useState<"care" | "medical" | "social">("care");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<GeminiSuggestion[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patient data for context-aware suggestions
  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", patientId],
  });

  // Save documentation mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documentation", {
        content,
        patientId,
        type: docType,
        shiftId,
        date: new Date().toISOString(),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentation"] });
      toast({
        title: "Dokumentation gespeichert",
        description: "Die Dokumentation wurde erfolgreich gespeichert.",
      });
      if (onSave) onSave(data);
    },
  });

  // Gemini AI suggestions mutation
  const getAiSuggestionsMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const res = await apiRequest("POST", "/api/documentation/suggest", {
        content,
        patientId,
        type: docType,
        patientContext: {
          careLevel: patient?.careLevel,
          medicalHistory: patient?.medicalHistory,
          medications: patient?.medications,
        },
      });
      if (!res.ok) throw new Error("Fehler bei KI-Analyse");
      return res.json();
    },
    onSuccess: (data: { suggestions: GeminiSuggestion[] }) => {
      setSuggestions(data.suggestions);
      toast({
        title: "KI-Analyse abgeschlossen",
        description: "Die Vorschläge wurden erfolgreich generiert.",
      });
    },
    onSettled: () => setIsAnalyzing(false),
  });

  // Quality check before saving
  const performQualityCheck = () => {
    const issues = [];
    if (content.length < 50) issues.push("Der Inhalt ist sehr kurz.");
    if (!/\d/.test(content)) issues.push("Keine messbaren Werte gefunden.");
    if (content.split(" ").length < 10) issues.push("Zu wenig Details.");

    return issues;
  };

  const handleSave = () => {
    const issues = performQualityCheck();
    if (issues.length > 0) {
      toast({
        title: "Qualitätsprüfung",
        description: (
          <div className="space-y-2">
            <p>Bitte überprüfen Sie folgende Punkte:</p>
            <ul className="list-disc pl-4">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        ),
        variant: "warning",
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Neue Dokumentation</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "PPP", { locale: de })}
          </p>
        </div>
        <Select value={docType} onValueChange={(v: "care" | "medical" | "social") => setDocType(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="care">Pflegedokumentation</SelectItem>
            <SelectItem value="medical">Medizinische Dokumentation</SelectItem>
            <SelectItem value="social">Sozialdokumentation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Dokumentation</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Beschreiben Sie den Verlauf..."
            className="min-h-[200px]"
          />
        </div>

        {/* AI Assistant */}
        <Card className="p-4 bg-blue-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span className="font-medium">KI-Assistent</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => getAiSuggestionsMutation.mutate()}
              disabled={isAnalyzing || content.length < 10}
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Analysieren
            </Button>
          </div>

          <div className="space-y-3">
            {suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-white border flex items-start gap-3 cursor-pointer hover:bg-blue-50/50 transition-colors"
                onClick={() => setContent(suggestion.content)}
              >
                {suggestion.type === "completion" ? (
                  <FileText className="h-4 w-4 text-blue-500 mt-1" />
                ) : suggestion.type === "correction" ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1" />
                ) : (
                  <Brain className="h-4 w-4 text-purple-500 mt-1" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {suggestion.type === "completion"
                        ? "Vervollständigung"
                        : suggestion.type === "correction"
                        ? "Korrekturvorschlag"
                        : "KI-Einsicht"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}% Konfidenz
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.content}
                  </p>
                </div>
              </div>
            ))}

            {suggestions.length === 0 && !isAnalyzing && (
              <div className="text-center text-muted-foreground py-4">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Starten Sie die KI-Analyse für intelligente Vorschläge</p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setContent(initialContent)}
            disabled={saveMutation.isPending}
          >
            Zurücksetzen
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
