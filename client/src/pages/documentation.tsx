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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-4 md:p-8 max-w-[1920px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Dokumentation
            </h1>
            <p className="text-muted-foreground text-lg">
              Verwalten Sie hier alle Patientendokumentationen
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <Column 
              title="Offen" 
              icon={<Clock className="h-5 w-5" />}
              count={docsByStatus[DocumentationStatus.PENDING]?.length || 0}
              gradient="from-blue-500/20 to-blue-600/20"
              iconColor="text-blue-600"
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
                      className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-900"
                    />
                  ))}
                  <div className="pt-4 border-t border-blue-100 dark:border-blue-900">
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
            </Column>

            <Column 
              title="In Überprüfung" 
              icon={<RefreshCw className="h-5 w-5" />}
              count={docsByStatus[DocumentationStatus.REVIEW]?.length || 0}
              gradient="from-amber-500/20 to-amber-600/20"
              iconColor="text-amber-600"
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
                  className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/50 dark:to-gray-900"
                />
              ))}
            </Column>

            <Column 
              title="Abgeschlossen" 
              icon={<Check className="h-5 w-5" />}
              count={docsByStatus[DocumentationStatus.COMPLETED]?.length || 0}
              gradient="from-green-500/20 to-green-600/20"
              iconColor="text-green-600"
            >
              {docsByStatus[DocumentationStatus.COMPLETED]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveBackward={() => moveDoc(doc.id, doc.status, 'backward')}
                  showMoveBackward
                  className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-gray-900"
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
  gradient: string;
  iconColor: string;
}

function Column({ title, icon, count, children, gradient, iconColor }: ColumnProps) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} backdrop-blur-xl shadow-lg p-4 transition-all duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full bg-white/80 dark:bg-gray-900/80 ${iconColor}`}>
            {icon}
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="px-3 py-1 text-sm font-medium rounded-full bg-white/80 dark:bg-gray-900/80 text-primary">
          {count}
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-4 pr-4">{children}</div>
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
  className?: string;
}

function DocumentCard({ 
  doc, 
  patient,
  onMoveForward,
  onMoveBackward,
  showMoveForward,
  showMoveBackward,
  className
}: DocumentCardProps) {
  if (!patient) return null;

  return (
    <Card className={`group relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">{patient.name}</h3>
          {doc.status === DocumentationStatus.COMPLETED ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : doc.status === DocumentationStatus.REVIEW ? (
            <RefreshCw className="h-4 w-4 text-amber-600" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600" />
          )}
        </div>

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
            <div className="mt-2 p-2 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground">Anmerkungen:</p>
              <p className="text-sm">{doc.reviewNotes}</p>
            </div>
          )}

          <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {showMoveBackward && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 hover:bg-muted"
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
                className="flex-1 hover:bg-muted"
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
    <Card className="group relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <Button
          variant="outline"
          className="w-full bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20"
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