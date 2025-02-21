import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc, DocumentationStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Brain, Check, Clock, RefreshCw, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/documentation/voice-recorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";

function DocumentationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const [activePatientId, setActivePatientId] = useState<number | null>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: allDocs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

  const docsByStatus = allDocs.reduce((acc, doc) => {
    if (!acc[doc.status]) {
      acc[doc.status] = [];
    }
    acc[doc.status].push(doc);
    return acc;
  }, {} as Record<string, Doc[]>);

  const updateDocStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/docs/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({
        title: "Status aktualisiert",
        description: "Die Dokumentation wurde erfolgreich aktualisiert.",
      });
    },
  });

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'DOC_STATUS_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
        toast({
          title: "Dokumentation aktualisiert",
          description: "Der Status einer Dokumentation wurde geändert.",
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, toast]);

  const moveDoc = (docId: number, currentStatus: string, direction: 'forward' | 'backward') => {
    const statusOrder = [DocumentationStatus.PENDING, DocumentationStatus.REVIEW, DocumentationStatus.COMPLETED];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let newStatus: string;

    if (direction === 'forward' && currentIndex < statusOrder.length - 1) {
      newStatus = statusOrder[currentIndex + 1];
    } else if (direction === 'backward' && currentIndex > 0) {
      newStatus = statusOrder[currentIndex - 1];
    } else {
      return;
    }

    updateDocStatusMutation.mutate({ id: docId, status: newStatus });
    sendMessage({
      type: 'DOC_STATUS_UPDATE',
      docId,
      status: newStatus
    });
  };

  const createDocMutation = useMutation({
    mutationFn: async (data: { content: string; patientId: number; type?: string; status: string }) => {
      const res = await apiRequest("POST", "/api/docs", {
        ...data,
        date: new Date().toISOString(),
        type: data.type || "Sprachaufnahme",
        aiGenerated: true,
        verified: false,
        caregiverId: user?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({
        title: "Dokumentation erstellt",
        description: "Die Dokumentation wurde erfolgreich gespeichert.",
      });
      setActivePatientId(null);
    },
  });

  const handleTranscriptionComplete = (text: string, sendToReview: boolean) => {
    if (!activePatientId) return;

    createDocMutation.mutate({
      content: text,
      patientId: activePatientId,
      type: "KI-Dokumentation",
      status: sendToReview ? DocumentationStatus.REVIEW : DocumentationStatus.COMPLETED,
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6 max-w-[1920px] mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Dokumentation
            </h1>
            <p className="text-sm text-muted-foreground">
              Verwalten Sie hier alle Patientendokumentationen
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Column 
              title="Offen" 
              icon={<Clock className="h-4 w-4" />}
              count={docsByStatus[DocumentationStatus.PENDING]?.length || 0}
              color="blue"
            >
              {activePatientId ? (
                <div className="space-y-4">
                  <VoiceRecorder
                    onTranscriptionComplete={handleTranscriptionComplete}
                    className="mb-4"
                  />
                  <Button
                    variant="outline"
                    className="w-full text-sm"
                    onClick={() => setActivePatientId(null)}
                  >
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <>
                  {docsByStatus[DocumentationStatus.PENDING]?.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      patient={patients.find(p => p.id === doc.patientId)!}
                      onMoveForward={() => moveDoc(doc.id, doc.status, 'forward')}
                      showMoveForward
                      color="blue"
                    />
                  ))}
                  <div className="pt-4 border-t border-border/40">
                    <h3 className="text-xs font-medium mb-3 text-muted-foreground">Neue Dokumentation</h3>
                    {patients.map((patient) => (
                      <NewDocumentationCard
                        key={patient.id}
                        patient={patient}
                        onStartRecording={() => setActivePatientId(patient.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </Column>

            <Column 
              title="In Überprüfung" 
              icon={<RefreshCw className="h-4 w-4" />}
              count={docsByStatus[DocumentationStatus.REVIEW]?.length || 0}
              color="amber"
            >
              {docsByStatus[DocumentationStatus.REVIEW]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveForward={() => moveDoc(doc.id, doc.status, 'forward')}
                  onMoveBackward={() => moveDoc(doc.id, doc.status, 'backward')}
                  showMoveForward
                  showMoveBackward
                  color="amber"
                />
              ))}
            </Column>

            <Column 
              title="Abgeschlossen" 
              icon={<Check className="h-4 w-4" />}
              count={docsByStatus[DocumentationStatus.COMPLETED]?.length || 0}
              color="green"
            >
              {docsByStatus[DocumentationStatus.COMPLETED]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveBackward={() => moveDoc(doc.id, doc.status, 'backward')}
                  showMoveBackward
                  color="green"
                />
              ))}
            </Column>
          </div>
        </main>
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  color: "blue" | "amber" | "green";
}

function Column({ title, icon, count, children, color }: ColumnProps) {
  const colorVariants = {
    blue: "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20",
    amber: "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20",
    green: "bg-green-500/5 border-green-500/10 hover:border-green-500/20",
  };

  return (
    <div className={`rounded-lg border shadow-lg transition-all duration-300 hover:shadow-xl ${colorVariants[color]}`}>
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">
              {icon}
            </div>
            <h2 className="text-sm font-medium">{title}</h2>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {count}
          </span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="p-3 space-y-3">{children}</div>
      </ScrollArea>
    </div>
  );
}

interface DocumentCardProps {
  doc: Doc;
  patient: Patient;
  onMoveForward?: () => void;
  onMoveBackward?: () => void;
  showMoveForward?: boolean;
  showMoveBackward?: boolean;
  color: "blue" | "amber" | "green";
}

function DocumentCard({ 
  doc, 
  patient,
  onMoveForward,
  onMoveBackward,
  showMoveForward,
  showMoveBackward,
  color
}: DocumentCardProps) {
  if (!patient) return null;

  const statusColors = {
    blue: "text-blue-500",
    amber: "text-amber-500",
    green: "text-green-500"
  };

  const borderColors = {
    blue: "hover:border-blue-500/20",
    amber: "hover:border-amber-500/20",
    green: "hover:border-green-500/20"
  };

  return (
    <Card className={`group relative border border-border/40 hover:shadow-lg transition-all duration-200 ${borderColors[color]}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{patient.name}</h3>
          {doc.status === DocumentationStatus.COMPLETED ? (
            <Check className={`h-4 w-4 ${statusColors.green}`} />
          ) : doc.status === DocumentationStatus.REVIEW ? (
            <RefreshCw className={`h-4 w-4 ${statusColors.amber}`} />
          ) : (
            <Clock className={`h-4 w-4 ${statusColors.blue}`} />
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {format(new Date(doc.reviewDate || doc.date), "dd.MM.yyyy HH:mm", { locale: de })}
        </p>

        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm line-clamp-3">{doc.content}</p>
        </div>

        {doc.reviewNotes && (
          <div className="text-xs p-3 rounded-lg bg-muted/20">
            <p className="text-muted-foreground mb-1">Anmerkungen:</p>
            <p>{doc.reviewNotes}</p>
          </div>
        )}

        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {showMoveBackward && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs flex-1 hover:bg-muted"
              onClick={onMoveBackward}
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Zurück
            </Button>
          )}
          {showMoveForward && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 text-xs flex-1 hover:bg-muted"
              onClick={onMoveForward}
            >
              Weiter
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewDocumentationCard({ patient, onStartRecording }: { patient: Patient; onStartRecording: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start text-xs h-9 mb-2 bg-card hover:bg-muted/50"
      onClick={onStartRecording}
    >
      <Plus className="mr-2 h-3 w-3" />
      {patient.name}
    </Button>
  );
}

export default DocumentationPage;