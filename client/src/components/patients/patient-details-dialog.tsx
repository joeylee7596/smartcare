import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Patient, Documentation } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Phone, MapPin, Calendar, Activity, Brain, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PatientDetailsDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientDetailsDialog({ patient, open, onOpenChange }: PatientDetailsDialogProps) {
  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs", patient?.id],
    enabled: !!patient,
  });

  const { data: careAnalysis = null } = useQuery({
    queryKey: ["/api/analysis", patient?.id],
    enabled: !!patient,
  });

  if (!patient) return null;

  const recentDocs = docs.slice(0, 5);
  const pendingDocs = docs.filter(doc => doc.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{patient.name}</span>
            <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
              Pflegegrad {patient.careLevel}
            </Badge>
            {careAnalysis?.riskAreas?.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Risikobereiche
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Patientenübersicht und KI-Analyse</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="documentation">Dokumentation</TabsTrigger>
            <TabsTrigger value="analysis">KI-Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4">
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.emergencyContact}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>Versicherung: {patient.insuranceProvider}</span>
                    </div>
                    {patient.lastVisit && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Letzter Besuch: {format(new Date(patient.lastVisit), "PPP", { locale: de })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-5 w-5 mb-2" />
                  Neue Dokumentation
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Brain className="h-5 w-5 mb-2" />
                  KI-Vorschläge
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Clock className="h-5 w-5 mb-2" />
                  Termin planen
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documentation">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {docs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Keine Dokumentation vorhanden</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {docs.map((doc) => (
                      <Card key={doc.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">
                            {format(new Date(doc.date), "PPP", { locale: de })}
                          </span>
                          <Badge variant={doc.status === "completed" ? "default" : "secondary"}>
                            {doc.status}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{doc.content}</p>
                        {doc.aiGenerated && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-blue-500">
                            <Brain className="h-3 w-3" />
                            <span>KI-unterstützt</span>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis">
            {careAnalysis ? (
              <div className="space-y-6">
                {/* Care Trends */}
                {careAnalysis.trends?.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      Entwicklungen
                    </h3>
                    <ul className="space-y-2">
                      {careAnalysis.trends.map((trend, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-400" />
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Care Suggestions */}
                {careAnalysis.suggestions?.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Vorschläge
                    </h3>
                    <ul className="space-y-2">
                      {careAnalysis.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-amber-400" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Risk Areas */}
                {careAnalysis.riskAreas?.length > 0 && (
                  <Card className="p-4 border-red-200/20">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      Risikobereiche
                    </h3>
                    <ul className="space-y-2">
                      {careAnalysis.riskAreas.map((risk, i) => (
                        <li key={i} className="text-sm flex items-center gap-2 text-red-600">
                          <div className="w-1 h-1 rounded-full bg-red-400" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keine KI-Analyse verfügbar</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}