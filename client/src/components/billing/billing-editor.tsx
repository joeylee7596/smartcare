import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Wand2, Plus, Trash2 } from "lucide-react";
import { InsuranceBilling, Patient } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BillingEditorProps {
  billing?: InsuranceBilling;
  patient: Patient;
  onSave: (billing: Partial<InsuranceBilling>) => void;
}

// Service catalog with common healthcare services
const serviceCatalog = [
  { code: "P1", description: "Grundpflege", baseAmount: 35.50 },
  { code: "P2", description: "Behandlungspflege", baseAmount: 45.00 },
  { code: "P3", description: "Hauswirtschaftliche Versorgung", baseAmount: 28.50 },
  { code: "P4", description: "Beratungsbesuch", baseAmount: 40.00 },
  { code: "P5", description: "Pflegevisite", baseAmount: 35.00 },
];

// Get service suggestions based on patient's care level
const getServiceSuggestions = (careLevel: number) => {
  const suggestions = [];

  if (careLevel >= 3) {
    suggestions.push(
      { code: "P1", description: "Intensivierte Grundpflege", baseAmount: 45.50 },
      { code: "P2", description: "Erweiterte Behandlungspflege", baseAmount: 55.00 }
    );
  }

  if (careLevel >= 4) {
    suggestions.push(
      { code: "P6", description: "Mobilisation und Transfer", baseAmount: 40.00 },
      { code: "P7", description: "Dekubitusprophylaxe", baseAmount: 35.00 }
    );
  }

  return [...serviceCatalog, ...suggestions];
};

export function BillingEditor({ billing, patient, onSave }: BillingEditorProps) {
  const [serviceEntries, setServiceEntries] = useState(billing?.services || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    format(billing?.date ? new Date(billing.date) : new Date(), "yyyy-MM-dd")
  );
  const { toast } = useToast();

  const suggestedServices = getServiceSuggestions(patient.careLevel);

  const addServiceEntry = () => {
    setServiceEntries([...serviceEntries, { code: "", description: "", amount: 0 }]);
  };

  const removeServiceEntry = (index: number) => {
    setServiceEntries(serviceEntries.filter((_, i) => i !== index));
  };

  const updateServiceEntry = (index: number, field: string, value: any) => {
    const newEntries = [...serviceEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setServiceEntries(newEntries);
  };

  // AI assistance for documentation completeness
  const getAIAssistance = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/billing-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          services: serviceEntries,
          careLevel: patient.careLevel,
          date: selectedDate,
        }),
      });

      if (!response.ok) throw new Error("Fehler bei der KI-Unterstützung");

      const data = await response.json();

      if (data.suggestions) {
        const enhancedServices = serviceEntries.map((service, index) => ({
          ...service,
          description: data.suggestions[index]?.enhancedDescription || service.description
        }));
        setServiceEntries(enhancedServices);
      }

      toast({
        title: "KI-Optimierung abgeschlossen",
        description: "Die Leistungsbeschreibungen wurden optimiert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "KI-Unterstützung konnte nicht abgerufen werden.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (serviceEntries.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fügen Sie mindestens eine Leistung hinzu.",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = serviceEntries.reduce((sum, service) => sum + (service.amount || 0), 0);

    onSave({
      patientId: patient.id,
      date: selectedDate,
      services: serviceEntries,
      totalAmount: totalAmount,
      status: "pending"
    });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Leistungserfassung</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getAIAssistance}
              disabled={isGenerating || serviceEntries.length === 0}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              KI-Optimierung
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={serviceEntries.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-6">
        <div className="space-y-6">
          {/* Patient Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Patienteninformation</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <p><strong>Name:</strong> {patient.name}</p>
                <p><strong>Versicherung:</strong> {patient.insuranceProvider}</p>
                <p><strong>Versicherungsnummer:</strong> {patient.insuranceNumber}</p>
              </div>
              <div>
                <p><strong>Pflegegrad:</strong> {patient.careLevel}</p>
                <p><strong>Adresse:</strong> {patient.address}</p>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <Label>Datum der Leistungserbringung</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Service Entries */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Leistungen</h3>
              <Button variant="outline" size="sm" onClick={addServiceEntry}>
                <Plus className="h-4 w-4 mr-2" />
                Leistung hinzufügen
              </Button>
            </div>
            <div className="space-y-4">
              {serviceEntries.map((service, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-start bg-gray-50 p-4 rounded-lg">
                  <div className="col-span-3">
                    <Label>Leistungscode</Label>
                    <Select
                      value={service.code}
                      onValueChange={(value) => {
                        const catalogService = suggestedServices.find(s => s.code === value);
                        if (catalogService) {
                          updateServiceEntry(index, 'code', value);
                          updateServiceEntry(index, 'description', catalogService.description);
                          updateServiceEntry(index, 'amount', catalogService.baseAmount);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Code wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {suggestedServices.map(item => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.code} - {item.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Label>Beschreibung</Label>
                    <Input
                      value={service.description}
                      onChange={(e) => updateServiceEntry(index, 'description', e.target.value)}
                      placeholder="Detaillierte Beschreibung der Leistung"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Betrag (€)</Label>
                    <Input
                      type="number"
                      value={service.amount}
                      onChange={(e) => updateServiceEntry(index, 'amount', parseFloat(e.target.value))}
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-end h-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeServiceEntry(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Gesamtbetrag:</span>
              <span className="text-xl font-bold">
                {serviceEntries.reduce((sum, service) => sum + (service.amount || 0), 0).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}