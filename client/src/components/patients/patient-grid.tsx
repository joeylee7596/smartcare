import { Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MapPin,
  FileText,
  Activity,
  MoreVertical,
  Edit,
  Trash2,
  Brain,
  Calendar,
  AlertTriangle,
  Heart
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditPatientDialog } from "./edit-patient-dialog";
import { useLocation } from "wouter";
import { CarePredictionDialog } from "./care-prediction-dialog";


interface PatientGridProps {
  patients: Patient[];
}

export function PatientGrid({ patients }: PatientGridProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showCarePrediction, setShowCarePrediction] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string>("");

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/patients/${id}`);
      if (!response.ok) {
        throw new Error("Fehler beim Löschen des Patienten");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient gelöscht",
        description: "Der Patient wurde erfolgreich gelöscht.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Der Patient konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const getAIInsights = async (patient: Patient) => {
    setAiLoading(true);
    try {
      const response = await apiRequest("POST", "/api/ai/patient-insights", {
        patientData: {
          name: patient.name,
          careLevel: patient.careLevel,
          medications: patient.medications,
          lastVisit: patient.lastVisit,
        },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der KI-Erkenntnisse");
      }

      const data = await response.json();
      setAiInsights(data.insights);
      setShowAIInsights(true);
    } catch (error) {
      toast({
        title: "Fehler",
        description: "KI-Erkenntnisse konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {patients.map((patient) => (
            <motion.div
              key={patient.id}
              variants={item}
              className="group"
            >
              <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold">{patient.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={patient.careLevel >= 4 ? "destructive" :
                            patient.careLevel >= 3 ? "secondary" : "default"}
                          className="text-xs"
                        >
                          Pflegegrad {patient.careLevel}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatient(patient);
                            getAIInsights(patient);
                          }}
                          disabled={aiLoading}
                        >
                          <Brain className="mr-2 h-4 w-4" />
                          KI-Analyse
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowCarePrediction(true);
                          }}
                        >
                          <Brain className="mr-2 h-4 w-4" />
                          Pflegebedarfsprognose
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(patient.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{patient.address}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{patient.emergencyContact}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{patient.insuranceProvider}</span>
                      </div>
                      {patient.lastVisit && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">
                            {format(new Date(patient.lastVisit), "dd.MM.yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation(`/documentation/${patient.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Dokumentation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setLocation(`/tours/${patient.id}`)}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Termine
                      </Button>
                    </div>

                    {patient.notes && (
                      <div className="mt-2 p-2 bg-muted rounded-md flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        {patient.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {selectedPatient && (
        <>
          <EditPatientDialog
            patient={selectedPatient}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
          />

          <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>KI-Analyse: {selectedPatient.name}</DialogTitle>
                <DialogDescription>
                  Automatisch generierte Erkenntnisse basierend auf den Patientendaten
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px] w-full pr-4">
                {aiLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm whitespace-pre-wrap">
                    {aiInsights}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <CarePredictionDialog
            patient={selectedPatient}
            open={showCarePrediction}
            onOpenChange={setShowCarePrediction}
          />
        </>
      )}
    </>
  );
}