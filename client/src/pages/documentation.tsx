import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc, DocumentationStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Mic, Brain, Check, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/documentation/voice-recorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket, sendMessage } from "@/lib/websocket"; // Assuming these functions exist

export default function Documentation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: allDocs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

  // Group docs by status
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

  // Subscribe to WebSocket updates
  useEffect(() => {
    const { subscribe } = useWebSocket();

    const unsubscribe = subscribe((message) => {
      if (message.type === 'DOC_STATUS_UPDATED') {
        // Invalidate the docs query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/docs"] });

        // Show a toast notification
        toast({
          title: "Dokumentation aktualisiert",
          description: "Der Status einer Dokumentation wurde geändert.",
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [toast]);


  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const newStatus = over.id as string;
      const docId = active.id as number;

      // Update the status locally through mutation
      updateDocStatusMutation.mutate({
        id: docId,
        status: newStatus,
      });

      // Notify other clients through WebSocket
      sendMessage({
        type: 'DOC_STATUS_UPDATE',
        docId,
        status: newStatus
      });
    }

    setDraggedItem(null);
  };

  const createDocMutation = useMutation({
    mutationFn: async (data: { content: string; patientId: number; type?: string }) => {
      const res = await apiRequest("POST", "/api/docs", {
        ...data,
        date: new Date().toISOString(),
        type: data.type || "Sprachaufnahme",
        aiGenerated: false,
        verified: false,
        status: DocumentationStatus.PENDING,
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

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: de });
    } catch (error) {
      console.error("Invalid date:", date);
      return "Ungültiges Datum";
    }
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

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pending Documents */}
              <div
                className="space-y-4"
                id={DocumentationStatus.PENDING}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Offen</h2>
                  <span className="text-sm text-muted-foreground">
                    {docsByStatus[DocumentationStatus.PENDING]?.length || 0}
                  </span>
                </div>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-4 pr-4">
                    {patients.map((patient) => (
                      <Card
                        key={patient.id}
                        className="relative"
                        draggable
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{patient.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {activePatientId === patient.id ? (
                            <VoiceRecorder
                              onTranscriptionComplete={handleTranscriptionComplete}
                              className="mb-4"
                            />
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setActivePatientId(patient.id)}
                            >
                              <Mic className="mr-2 h-4 w-4" />
                              Sprachaufnahme
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* In Review Documents */}
              <div
                className="space-y-4"
                id={DocumentationStatus.REVIEW}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">In Überprüfung</h2>
                  <span className="text-sm text-muted-foreground">
                    {docsByStatus[DocumentationStatus.REVIEW]?.length || 0}
                  </span>
                </div>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-4 pr-4">
                    {docsByStatus[DocumentationStatus.REVIEW]?.map((doc) => (
                      <Card
                        key={doc.id}
                        className="relative cursor-move"
                        draggable
                        data-id={doc.id}
                        data-status={doc.status}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{patients.find(p => p.id === doc.patientId)?.name || `Patient #${doc.patientId}`}</span>
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
                                {doc.status === DocumentationStatus.COMPLETED ? 'Abgeschlossen am' : 'Erstellt am'}
                              </span>
                              <span>{formatDate(doc.reviewDate || doc.date)}</span>
                            </div>
                            <p className="text-sm line-clamp-3">{doc.content}</p>
                            {doc.reviewNotes && (
                              <div className="mt-2 p-2 bg-muted rounded-sm">
                                <p className="text-xs text-muted-foreground">Anmerkungen:</p>
                                <p className="text-sm">{doc.reviewNotes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Completed Documents */}
              <div
                className="space-y-4"
                id={DocumentationStatus.COMPLETED}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Abgeschlossen</h2>
                  <span className="text-sm text-muted-foreground">
                    {docsByStatus[DocumentationStatus.COMPLETED]?.length || 0}
                  </span>
                </div>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  <div className="space-y-4 pr-4">
                    {docsByStatus[DocumentationStatus.COMPLETED]?.map((doc) => (
                      <Card
                        key={doc.id}
                        className="relative cursor-move"
                        draggable
                        data-id={doc.id}
                        data-status={doc.status}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{patients.find(p => p.id === doc.patientId)?.name || `Patient #${doc.patientId}`}</span>
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
                                {doc.status === DocumentationStatus.COMPLETED ? 'Abgeschlossen am' : 'Erstellt am'}
                              </span>
                              <span>{formatDate(doc.reviewDate || doc.date)}</span>
                            </div>
                            <p className="text-sm line-clamp-3">{doc.content}</p>
                            {doc.reviewNotes && (
                              <div className="mt-2 p-2 bg-muted rounded-sm">
                                <p className="text-xs text-muted-foreground">Anmerkungen:</p>
                                <p className="text-sm">{doc.reviewNotes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DragOverlay>
              {draggedItem && (
                <div className="bg-background p-4 rounded-lg shadow-lg border">
                  Dokument wird verschoben...
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}