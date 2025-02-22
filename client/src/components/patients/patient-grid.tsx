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
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditPatientDialog } from "./edit-patient-dialog";
import { Link, useLocation } from "wouter";
import { CarePredictionDialog } from "./care-prediction-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
              <Card className="relative overflow-hidden transition-all duration-500 
                hover:scale-[1.02] hover:-translate-y-1 hover:rotate-[0.5deg]
                rounded-2xl
                bg-gradient-to-br from-white via-blue-50/30 to-white
                shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1),0_0_20px_-5px_rgba(0,0,0,0.05)]
                hover:shadow-[0_20px_60px_-20px_rgba(59,130,246,0.3),0_0_30px_-10px_rgba(59,130,246,0.2)]
                backdrop-blur-sm border border-white/40
                group"
                onClick={() => setSelectedPatient(patient)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {patient.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={patient.careLevel >= 4 ? "destructive" :
                            patient.careLevel >= 3 ? "secondary" : "default"}
                          className="text-sm rounded-lg font-medium px-3 py-1
                            shadow-sm group-hover:shadow-md
                            transition-all duration-500 group-hover:scale-105
                            backdrop-blur-sm"
                        >
                          Pflegegrad {patient.careLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="relative z-50">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl transition-all duration-300
                              hover:bg-blue-50 hover:text-blue-600
                              hover:scale-110 hover:rotate-12
                              relative z-50"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 rounded-xl border border-white/40 bg-white/80
                            backdrop-blur-sm shadow-xl z-50"
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowEditDialog(true);
                            }}
                            className="rounded-lg transition-all duration-300
                              hover:bg-blue-50 hover:text-blue-600 focus:bg-blue-50 focus:text-blue-600
                              hover:pl-6"
                          >
                            <Edit className="mr-2 h-5 w-5" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              getAIInsights(patient);
                            }}
                            disabled={aiLoading}
                            className="rounded-lg transition-all duration-300
                              hover:bg-purple-50 hover:text-purple-600 focus:bg-purple-50 focus:text-purple-600
                              hover:pl-6"
                          >
                            <Brain className="mr-2 h-5 w-5" />
                            KI-Analyse
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowCarePrediction(true);
                            }}
                            className="rounded-lg transition-all duration-300
                              hover:bg-green-50 hover:text-green-600 focus:bg-green-50 focus:text-green-600
                              hover:pl-6"
                          >
                            <Brain className="mr-2 h-5 w-5" />
                            Pflegebedarfsprognose
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive rounded-lg transition-all duration-300
                              hover:bg-red-50 focus:bg-red-50
                              hover:pl-6"
                            onClick={() => deleteMutation.mutate(patient.id)}
                          >
                            <Trash2 className="mr-2 h-5 w-5" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80
                          shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20
                          transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                          <MapPin className="h-5 w-5 text-blue-500" />
                        </div>
                        <span className="truncate text-gray-600 font-medium">{patient.address}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/80
                          shadow-lg shadow-green-500/10 group-hover:shadow-green-500/20
                          transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                          <Phone className="h-5 w-5 text-green-500" />
                        </div>
                        <span className="truncate text-gray-600 font-medium">{patient.emergencyContact}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/80
                          shadow-lg shadow-purple-500/10 group-hover:shadow-purple-500/20
                          transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                          <Heart className="h-5 w-5 text-purple-500" />
                        </div>
                        <span className="truncate text-gray-600 font-medium">{patient.insuranceProvider}</span>
                      </div>
                      {patient.lastVisit && (
                        <div className="flex items-center space-x-3 text-sm">
                          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/80
                            shadow-lg shadow-orange-500/10 group-hover:shadow-orange-500/20
                            transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                            <Calendar className="h-5 w-5 text-orange-500" />
                          </div>
                          <span className="truncate text-gray-600 font-medium">
                            {format(new Date(patient.lastVisit), "dd.MM.yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Link 
                        href={`/documentation?patient=${patient.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-12 rounded-xl
                            bg-gradient-to-r from-white to-blue-50/50
                            hover:from-blue-50 hover:to-blue-100/50
                            border border-white/40 hover:border-blue-200
                            shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                            hover:-translate-y-0.5 hover:scale-[1.02]
                            transition-all duration-500 group"
                        >
                          <FileText className="h-5 w-5 mr-2 transition-transform duration-500
                            group-hover:scale-110 group-hover:rotate-6" />
                          <span className="font-medium">Dokumentation</span>
                        </Button>
                      </Link>

                      <Link 
                        href={`/tours?patient=${patient.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-12 rounded-xl
                            bg-gradient-to-r from-white to-purple-50/50
                            hover:from-purple-50 hover:to-purple-100/50
                            border border-white/40 hover:border-purple-200
                            shadow-lg shadow-purple-500/5 hover:shadow-purple-500/20
                            hover:-translate-y-0.5 hover:scale-[1.02]
                            transition-all duration-500 group"
                        >
                          <Calendar className="h-5 w-5 mr-2 transition-transform duration-500
                            group-hover:scale-110 group-hover:rotate-6" />
                          <span className="font-medium">Termine</span>
                        </Button>
                      </Link>
                    </div>

                    {patient.notes && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-amber-100/50
                        border border-amber-200/50
                        shadow-lg shadow-amber-500/5
                        flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200/80
                          shadow-md shadow-amber-500/10">
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-amber-700 font-medium">{patient.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>

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
            <DialogContent className="max-w-2xl rounded-2xl border border-white/20 backdrop-blur-sm
              shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  KI-Analyse: {selectedPatient.name}
                </DialogTitle>
                <DialogDescription className="text-gray-500">
                  Automatisch generierte Erkenntnisse basierend auf den Patientendaten
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px] w-full pr-4">
                {aiLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-500/20 border-l-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4 text-base whitespace-pre-wrap text-gray-600 leading-relaxed">
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