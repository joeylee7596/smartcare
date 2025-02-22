import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Wand2, Copy, CheckCircle2 } from "lucide-react";
import { InsuranceBilling, Patient } from "@shared/schema";

interface BillingEditorProps {
  billing: InsuranceBilling;
  patient: Patient;
  onSave: (billing: Partial<InsuranceBilling>) => void;
}

// Platzhalter-Definitionen
const placeholders = {
  patient: {
    name: "{{patient.name}}",
    insuranceNumber: "{{patient.insuranceNumber}}",
    insuranceProvider: "{{patient.insuranceProvider}}",
    address: "{{patient.address}}",
    birthDate: "{{patient.birthDate}}",
  },
  billing: {
    id: "{{billing.id}}",
    date: "{{billing.date}}",
    totalAmount: "{{billing.totalAmount}}",
    services: "{{billing.services}}",
  },
};

export function BillingEditor({ billing, patient, onSave }: BillingEditorProps) {
  const [content, setContent] = useState(billing.content || "");
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const { toast } = useToast();

  // Vorlagen für verschiedene Krankenkassen
  const templates = {
    default: `Sehr geehrte Damen und Herren,

hiermit reichen wir die Abrechnung für folgende Leistungen ein:

Patient: ${placeholders.patient.name}
Versicherungsnummer: ${placeholders.patient.insuranceNumber}
Krankenkasse: ${placeholders.patient.insuranceProvider}

Leistungszeitraum: ${placeholders.billing.date}
Leistungen:
${placeholders.billing.services}

Gesamtbetrag: ${placeholders.billing.totalAmount} €

Mit freundlichen Grüßen`,
    aok: `AOK-spezifische Vorlage...`,
    tk: `Techniker-Krankenkasse-spezifische Vorlage...`,
    // Weitere Vorlagen...
  };

  // KI-Vorschläge abrufen
  const getAISuggestions = async () => {
    try {
      const response = await fetch("/api/ai/billing-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, patient, billing }),
      });
      
      if (!response.ok) throw new Error("Fehler beim Abrufen der KI-Vorschläge");
      
      const suggestions = await response.json();
      setContent(suggestions.improvedContent);
      
      toast({
        title: "KI-Optimierung abgeschlossen",
        description: "Der Inhalt wurde optimiert und verbessert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "KI-Vorschläge konnten nicht abgerufen werden.",
        variant: "destructive",
      });
    }
  };

  // Platzhalter ersetzen
  const replacePlaceholders = (text: string) => {
    let result = text;
    // Patient-Platzhalter ersetzen
    Object.entries(placeholders.patient).forEach(([key, placeholder]) => {
      result = result.replace(new RegExp(placeholder, 'g'), patient[key as keyof typeof patient]?.toString() || '');
    });
    // Billing-Platzhalter ersetzen
    Object.entries(placeholders.billing).forEach(([key, placeholder]) => {
      if (key === 'services') {
        const servicesText = billing.services
          .map(s => `- ${s.description}: ${s.amount.toFixed(2)} €`)
          .join('\n');
        result = result.replace(placeholder, servicesText);
      } else {
        result = result.replace(new RegExp(placeholder, 'g'), billing[key as keyof typeof billing]?.toString() || '');
      }
    });
    return result;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Abrechnungseditor</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const finalContent = replacePlaceholders(content);
                navigator.clipboard.writeText(finalContent);
                toast({
                  title: "Kopiert",
                  description: "Der Inhalt wurde in die Zwischenablage kopiert.",
                });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Kopieren
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={getAISuggestions}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              KI-Optimierung
            </Button>
            <Button
              size="sm"
              onClick={() => onSave({ content })}
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-6">
        <div className="mb-4">
          <Label>Vorlage auswählen</Label>
          <Select
            value={selectedTemplate}
            onValueChange={(value) => {
              setSelectedTemplate(value);
              setContent(templates[value as keyof typeof templates]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wählen Sie eine Vorlage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard-Vorlage</SelectItem>
              <SelectItem value="aok">AOK-Vorlage</SelectItem>
              <SelectItem value="tk">TK-Vorlage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="edit">
          <TabsList className="mb-4">
            <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
            <TabsTrigger value="placeholders">Platzhalter</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="h-[calc(100vh-400px)]">
            <ScrollArea className="h-full">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Geben Sie hier den Abrechnungstext ein..."
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="h-[calc(100vh-400px)]">
            <ScrollArea className="h-full">
              <div className="prose max-w-none p-4 rounded-md border bg-white">
                {replacePlaceholders(content).split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="placeholders" className="h-[calc(100vh-400px)]">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Patienten-Platzhalter</h3>
                  <div className="grid gap-2">
                    {Object.entries(placeholders.patient).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded-md border bg-white">
                        <code className="text-sm">{value}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                            toast({
                              title: "Kopiert",
                              description: "Platzhalter wurde in die Zwischenablage kopiert.",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Abrechnungs-Platzhalter</h3>
                  <div className="grid gap-2">
                    {Object.entries(placeholders.billing).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded-md border bg-white">
                        <code className="text-sm">{value}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(value);
                            toast({
                              title: "Kopiert",
                              description: "Platzhalter wurde in die Zwischenablage kopiert.",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
