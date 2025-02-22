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
                      <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        {patient.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={patient.careLevel >= 4 ? "destructive" :
                            patient.careLevel >= 3 ? "secondary" : "default"}
                          className="text-xs rounded-lg font-medium px-2.5 py-0.5 
                            transition-all duration-300 group-hover:scale-105"
                        >
                          Pflegegrad {patient.careLevel}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 rounded-full transition-all duration-300
                            hover:bg-blue-50 hover:text-blue-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="w-48 rounded-xl border border-white/40 bg-white/80 
                          backdrop-blur-sm shadow-lg"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowEditDialog(true);
                          }}
                          className="rounded-lg transition-colors duration-300
                            hover:bg-blue-50 hover:text-blue-600 focus:bg-blue-50 focus:text-blue-600"
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
                          className="rounded-lg transition-colors duration-300
                            hover:bg-purple-50 hover:text-purple-600 focus:bg-purple-50 focus:text-purple-600"
                        >
                          <Brain className="mr-2 h-4 w-4" />
                          KI-Analyse
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowCarePrediction(true);
                          }}
                          className="rounded-lg transition-colors duration-300
                            hover:bg-green-50 hover:text-green-600 focus:bg-green-50 focus:text-green-600"
                        >
                          <Brain className="mr-2 h-4 w-4" />
                          Pflegebedarfsprognose
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive rounded-lg transition-colors duration-300
                            hover:bg-red-50 focus:bg-red-50"
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
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="truncate text-gray-600">{patient.address}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="p-1.5 rounded-lg bg-green-50 text-green-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span className="truncate text-gray-600">{patient.emergencyContact}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="p-1.5 rounded-lg bg-purple-50 text-purple-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <Heart className="h-4 w-4" />
                        </div>
                        <span className="truncate text-gray-600">{patient.insuranceProvider}</span>
                      </div>
                      {patient.lastVisit && (
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <span className="truncate text-gray-600">
                            {format(new Date(patient.lastVisit), "dd.MM.yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl bg-gradient-to-r from-white to-blue-50/50
                          hover:from-blue-50 hover:to-blue-100/50
                          border border-white/40 hover:border-blue-200
                          shadow-sm hover:shadow-lg hover:-translate-y-0.5
                          transition-all duration-300 group"
                        onClick={() => setLocation(`/documentation/${patient.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                        Dokumentation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl bg-gradient-to-r from-white to-purple-50/50
                          hover:from-purple-50 hover:to-purple-100/50
                          border border-white/40 hover:border-purple-200
                          shadow-sm hover:shadow-lg hover:-translate-y-0.5
                          transition-all duration-300 group"
                        onClick={() => setLocation(`/tours/${patient.id}`)}
                      >
                        <Calendar className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                        Termine
                      </Button>
                    </div>

                    {patient.notes && (
                      <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50
                        border border-amber-200/50 flex items-center gap-2 text-sm">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <p className="text-amber-700">{patient.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Hover overlay with gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.02] to-transparent 
                  opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
            <DialogContent className="rounded-2xl border border-white/20 backdrop-blur-sm
              shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <DialogHeader>
                <DialogTitle className="text-xl bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  KI-Analyse: {selectedPatient.name}
                </DialogTitle>
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
                  <div className="space-y-4 text-sm whitespace-pre-wrap text-gray-600">
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