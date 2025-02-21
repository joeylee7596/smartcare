import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    mutationFn: async (data: { content: string; patientId: number; type?: string }) => {
      const res = await apiRequest("POST", "/api/docs", {
        ...data,
        date: new Date().toISOString(),
        type: data.type || "Sprachaufnahme",
        aiGenerated: true,
        verified: false,
        status: DocumentationStatus.PENDING,
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

  const handleTranscriptionComplete = (text: string) => {
    if (!activePatientId) return;

    createDocMutation.mutate({
      content: text,
      patientId: activePatientId,
      type: "KI-Dokumentation",
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Dokumentation
            </h1>
            <p className="text-muted-foreground">
              Verwalten Sie hier alle Patientendokumentationen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusColumn
              title="Offen"
              count={docsByStatus[DocumentationStatus.PENDING]?.length || 0}
            >
              {activePatientId ? (
                <div className="space-y-4">
                  <VoiceRecorder
                    onTranscriptionComplete={handleTranscriptionComplete}
                    className="mb-4"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
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
                    />
                  ))}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Neue Dokumentation</h3>
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
            </StatusColumn>

            <StatusColumn
              title="In Überprüfung"
              count={docsByStatus[DocumentationStatus.REVIEW]?.length || 0}
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
                />
              ))}
            </StatusColumn>

            <StatusColumn
              title="Abgeschlossen"
              count={docsByStatus[DocumentationStatus.COMPLETED]?.length || 0}
            >
              {docsByStatus[DocumentationStatus.COMPLETED]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveBackward={() => moveDoc(doc.id, doc.status, 'backward')}
                  showMoveBackward
                />
              ))}
            </StatusColumn>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusColumn({
  title,
  count,
  children
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card transition-all duration-200">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {count}
          </span>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="p-4 space-y-4">{children}</div>
      </ScrollArea>
    </div>
  );
}

function DocumentCard({ 
  doc, 
  patient,
  onMoveForward,
  onMoveBackward,
  showMoveForward,
  showMoveBackward
}: { 
  doc: Doc; 
  patient: Patient;
  onMoveForward?: () => void;
  onMoveBackward?: () => void;
  showMoveForward?: boolean;
  showMoveBackward?: boolean;
}) {
  if (!patient) return null;

  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{patient.name}</span>
          {doc.status === DocumentationStatus.COMPLETED ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : doc.status === DocumentationStatus.REVIEW ? (
            <RefreshCw className="h-4 w-4 text-amber-600" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {doc.status === DocumentationStatus.COMPLETED
                ? "Abgeschlossen am"
                : "Erstellt am"}
            </span>
            <span className="font-medium">
              {format(new Date(doc.reviewDate || doc.date), "dd.MM.yyyy HH:mm", { locale: de })}
            </span>
          </div>
          <p className="text-sm line-clamp-3">{doc.content}</p>
          {doc.reviewNotes && (
            <div className="mt-2 p-2 bg-muted rounded-sm">
              <p className="text-xs text-muted-foreground">Anmerkungen:</p>
              <p className="text-sm">{doc.reviewNotes}</p>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            {showMoveBackward && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onMoveBackward}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Zurück
              </Button>
            )}
            {showMoveForward && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={onMoveForward}
              >
                Weiter
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewDocumentationCard({ patient, onStartRecording }: { patient: Patient; onStartRecording: () => void }) {
  return (
    <Card className="relative hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={onStartRecording}
        >
          <Plus className="mr-2 h-4 w-4" />
          Neue Dokumentation für {patient.name}
        </Button>
      </CardContent>
    </Card>
  );
}

export default DocumentationPage;