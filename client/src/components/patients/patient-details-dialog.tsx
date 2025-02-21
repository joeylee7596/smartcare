import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Patient, Documentation } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { FileText, Phone, MapPin, Calendar, Activity } from "lucide-react";

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

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{patient.name}</span>
            <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
              Pflegegrad {patient.careLevel}
            </Badge>
          </DialogTitle>
          <DialogDescription>Patientendetails und Dokumentation</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info */}
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{patient.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{patient.emergencyContact}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>Versicherung: {patient.insuranceProvider}</span>
            </div>
            {patient.lastVisit && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Letzter Besuch: {format(new Date(patient.lastVisit), "PPP", { locale: de })}
                </span>
              </div>
            )}
          </div>

          {/* Documentation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Dokumentation</h3>
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {docs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Dokumentation vorhanden</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">
                          {format(new Date(doc.date), "PPP", { locale: de })}
                        </span>
                        <Badge variant={doc.status === "completed" ? "default" : "secondary"}>
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{doc.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
