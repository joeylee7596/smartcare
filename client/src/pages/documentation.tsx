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
  }, {} as Record<DocumentationStatus, Doc[]>);

  const updateDocStatusMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: number; status: DocumentationStatus; reviewNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/docs/${id}`, { status, reviewNotes });
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

  const moveDoc = (docId: number, currentStatus: DocumentationStatus, direction: 'forward' | 'backward') => {
    const statusOrder = [DocumentationStatus.PENDING, DocumentationStatus.REVIEW, DocumentationStatus.COMPLETED];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let newStatus: DocumentationStatus;

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
    mutationFn: async (data: { content: string; patientId: number; type?: string; status: DocumentationStatus }) => {
      const res = await apiRequest("POST", "/api/docs", {
        ...data,
        date: new Date().toISOString(),
        type: data.type || "Sprachaufnahme",
        aiGenerated: true,
        verified: false,
        employeeId: user?.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      toast({
        title: "Dokumentation erstellt",
        description: "Die Dokumentation wurde erfolgreich gespeichert.",
      });
      setActivePatientId(null);

      // Send WebSocket message for real-time updates
      sendMessage({
        type: 'DOC_STATUS_UPDATE',
        docId: data.id,
        status: data.status
      });
    },
  });

  const handleTranscriptionComplete = (text: string, sendToReview: boolean) => {
    if (!activePatientId) return;

    createDocMutation.mutate({
      content: text,
      patientId: activePatientId,
      type: "KI-Dokumentation",
      status: sendToReview ? DocumentationStatus.REVIEW : DocumentationStatus.PENDING,
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8 max-w-[1920px] mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Dokumentation
            </h1>
            <p className="text-lg text-gray-500">
              Verwalten Sie hier alle Patientendokumentationen
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Column 
              title="Offen" 
              icon={<Clock className="h-5 w-5" />}
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
                    className="w-full text-sm h-12 rounded-xl
                      bg-gradient-to-r from-white to-blue-50/50
                      hover:from-blue-50 hover:to-blue-100/50
                      border border-white/40 hover:border-blue-200
                      shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                      hover:-translate-y-0.5 hover:scale-[1.02]
                      transition-all duration-500 group"
                    onClick={() => setActivePatientId(null)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-500 
                      group-hover:scale-110 group-hover:-translate-x-1" />
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
                      onMoveForward={() => moveDoc(doc.id, doc.status as DocumentationStatus, 'forward')}
                      showMoveForward
                      color="blue"
                    />
                  ))}
                  <div className="pt-4 border-t border-white/20">
                    <h3 className="text-sm font-medium mb-3 text-gray-500">Neue Dokumentation</h3>
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
              color="amber"
            >
              {docsByStatus[DocumentationStatus.REVIEW]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveForward={() => moveDoc(doc.id, doc.status as DocumentationStatus, 'forward')}
                  onMoveBackward={() => moveDoc(doc.id, doc.status as DocumentationStatus, 'backward')}
                  showMoveForward
                  showMoveBackward
                  color="amber"
                />
              ))}
            </Column>

            <Column 
              title="Abgeschlossen" 
              icon={<Check className="h-5 w-5" />}
              count={docsByStatus[DocumentationStatus.COMPLETED]?.length || 0}
              color="green"
            >
              {docsByStatus[DocumentationStatus.COMPLETED]?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  patient={patients.find(p => p.id === doc.patientId)!}
                  onMoveBackward={() => moveDoc(doc.id, doc.status as DocumentationStatus, 'backward')}
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
    blue: {
      bg: "bg-blue-500/5 hover:bg-blue-500/10",
      border: "border-blue-500/10 hover:border-blue-500/20",
      shadow: "shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20",
      text: "text-blue-500"
    },
    amber: {
      bg: "bg-amber-500/5 hover:bg-amber-500/10",
      border: "border-amber-500/10 hover:border-amber-500/20",
      shadow: "shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20",
      text: "text-amber-500"
    },
    green: {
      bg: "bg-green-500/5 hover:bg-green-500/10",
      border: "border-green-500/10 hover:border-green-500/20",
      shadow: "shadow-lg shadow-green-500/5 hover:shadow-green-500/20",
      text: "text-green-500"
    },
  };

  const variant = colorVariants[color];

  return (
    <div className={`rounded-2xl border backdrop-blur-sm 
      transition-all duration-500 
      ${variant.bg} ${variant.border} ${variant.shadow}`}>
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${variant.text}`}>
              {icon}
            </div>
            <h2 className="text-base font-medium bg-gradient-to-r from-gray-900 to-gray-600 
              bg-clip-text text-transparent">{title}</h2>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-lg
            ${variant.bg} ${variant.text}`}>
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

  const colorVariants = {
    blue: {
      bg: "hover:bg-blue-50/50",
      border: "border-blue-200/20 hover:border-blue-300/30",
      shadow: "shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20",
      icon: "text-blue-500",
      iconBg: "bg-blue-50"
    },
    amber: {
      bg: "hover:bg-amber-50/50",
      border: "border-amber-200/20 hover:border-amber-300/30",
      shadow: "shadow-lg shadow-amber-500/5 hover:shadow-amber-500/20",
      icon: "text-amber-500",
      iconBg: "bg-amber-50"
    },
    green: {
      bg: "hover:bg-green-50/50",
      border: "border-green-200/20 hover:border-green-300/30",
      shadow: "shadow-lg shadow-green-500/5 hover:shadow-green-500/20",
      icon: "text-green-500",
      iconBg: "bg-green-50"
    }
  };

  const variant = colorVariants[color];

  return (
    <Card className={`group relative overflow-hidden
      bg-white/80 backdrop-blur-sm
      border ${variant.border}
      rounded-xl ${variant.shadow}
      transition-all duration-500
      hover:-translate-y-1 hover:scale-[1.02] ${variant.bg}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium bg-gradient-to-r from-gray-900 to-gray-600 
            bg-clip-text text-transparent">{patient.name}</h3>
          <div className={`p-2 rounded-lg ${variant.iconBg} ${variant.icon}
            transition-all duration-500 group-hover:scale-110 group-hover:rotate-12`}>
            {doc.status === DocumentationStatus.COMPLETED ? (
              <Check className="h-4 w-4" />
            ) : doc.status === DocumentationStatus.REVIEW ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {format(new Date(doc.reviewDate || doc.date), "dd.MM.yyyy HH:mm", { locale: de })}
        </p>

        <div className="bg-gray-50/80 rounded-lg p-3">
          <p className="text-sm line-clamp-3 text-gray-600">{doc.content}</p>
        </div>

        {doc.reviewNotes && (
          <div className="text-xs p-3 rounded-lg bg-amber-50/50 border border-amber-200/20">
            <p className="text-amber-700 font-medium mb-1">Anmerkungen:</p>
            <p className="text-amber-600">{doc.reviewNotes}</p>
          </div>
        )}

        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
          {showMoveBackward && (
            <Button 
              variant="ghost" 
              size="sm"
              className={`h-9 text-sm flex-1 rounded-lg
                hover:bg-gray-50 transition-all duration-300 group/btn`}
              onClick={onMoveBackward}
            >
              <ArrowLeft className="w-4 h-4 mr-1 transition-transform duration-300 
                group-hover/btn:scale-110 group-hover/btn:-translate-x-1" />
              Zurück
            </Button>
          )}
          {showMoveForward && (
            <Button 
              variant="ghost" 
              size="sm"
              className={`h-9 text-sm flex-1 rounded-lg
                hover:bg-gray-50 transition-all duration-300 group/btn`}
              onClick={onMoveForward}
            >
              Weiter
              <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-300 
                group-hover/btn:scale-110 group-hover/btn:translate-x-1" />
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
      className="w-full justify-start h-12 rounded-xl mb-2
        bg-gradient-to-r from-white to-blue-50/50
        hover:from-blue-50 hover:to-blue-100/50
        border border-white/40 hover:border-blue-200
        shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
        hover:-translate-y-0.5 hover:scale-[1.02]
        transition-all duration-500 group"
      onClick={onStartRecording}
    >
      <Plus className="mr-2 h-4 w-4 transition-transform duration-500 
        group-hover:scale-110 group-hover:rotate-12" />
      <span className="font-medium">{patient.name}</span>
    </Button>
  );
}

export default DocumentationPage;