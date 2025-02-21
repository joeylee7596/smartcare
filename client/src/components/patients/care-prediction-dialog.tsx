import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Patient } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Brain } from "lucide-react";

interface CarePredictionDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarePredictionDialog({ patient, open, onOpenChange }: CarePredictionDialogProps) {
  const { toast } = useToast();
  const predictionMutation = useMutation({
    mutationFn: async (patient: Patient) => {
      const response = await apiRequest("POST", "/api/ai/care-prediction", {
        patientData: {
          name: patient.name,
          careLevel: patient.careLevel,
          medications: patient.medications,
          lastVisit: patient.lastVisit,
          notes: patient.notes,
          emergencyContact: patient.emergencyContact,
          insuranceProvider: patient.insuranceProvider,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Fehler bei der Erstellung der Pflegebedarfsprognose");
      }

      const data = await response.json();
      return data.prediction;
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Prognose konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  if (!patient) return null;

  // Trigger prediction when dialog opens
  if (open && !predictionMutation.data && !predictionMutation.isPending) {
    predictionMutation.mutate(patient);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pflegebedarfsprognose: {patient.name}</DialogTitle>
          <DialogDescription>
            KI-gestützte Analyse und Vorhersage des zukünftigen Pflegebedarfs
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] w-full pr-4">
          {predictionMutation.isPending ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Erstelle Pflegebedarfsprognose...
              </p>
            </div>
          ) : predictionMutation.isError ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-destructive">
              <Brain className="h-8 w-8" />
              <p>Fehler bei der Erstellung der Prognose</p>
            </div>
          ) : (
            <div className="space-y-4 text-sm whitespace-pre-wrap">
              {predictionMutation.data}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
