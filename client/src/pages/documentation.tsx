import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc, DocumentationStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Check,
  Clock,
  Search,
  MessageSquare,
  FileText,
  Mic,
  History,
  Calendar,
  Heart,
  AlertTriangle,
  Sparkles,
  PenSquare,
  ListChecks,
  Filter,
  Settings2,
  Plus,
  ArrowLeft,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/documentation/voice-recorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from 'wouter';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortAsc, SortDesc } from "lucide-react";


function DocumentationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [documentationType, setDocumentationType] = useState<'quick' | 'template' | 'form'>('quick');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<DocumentationStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [, params] = useLocation();

  // Fetch data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: allDocs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

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
    mutationFn: async (data: {
      content: string;
      patientId: number;
      type: string;
      status: DocumentationStatus
    }) => {
      const docData = {
        patientId: data.patientId,
        employeeId: user?.id,
        date: new Date().toISOString(),
        content: data.content.trim(),
        type: data.type,
        status: data.status,
        aiGenerated: true,
        verified: false,
        reviewerId: null,
        reviewNotes: null,
        reviewDate: null,
        audioRecordingUrl: null
      };

      const res = await apiRequest("POST", "/api/docs", docData);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Fehler beim Erstellen der Dokumentation");
      }

      return res.json();
    }
  });


  const handleTranscriptionComplete = async (text: string, sendToReview: boolean) => {
    if (!selectedPatient || !selectedPatient.id) return;

    try {
      const newDoc = await createDocMutation.mutateAsync({
        content: text,
        patientId: selectedPatient.id,
        type: "KI-Dokumentation",
        status: sendToReview ? DocumentationStatus.REVIEW : DocumentationStatus.PENDING,
      });

      if (newDoc) {
        toast({
          title: "Dokumentation erstellt",
          description: sendToReview
            ? "Die Dokumentation wurde zur Überprüfung weitergeleitet."
            : "Die Dokumentation wurde gespeichert.",
        });

        sendMessage({
          type: 'DOC_STATUS_UPDATE',
          docId: newDoc.id,
          status: newDoc.status
        });

        queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      }
    } catch (error) {
      console.error("Failed to create documentation:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Dokumentation konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Top Section */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Dokumentation
              </h1>
              <p className="text-lg text-gray-500">
                Intelligente Patientendokumentation mit KI-Unterstützung
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Suchen..."
                  className="pl-10 w-64"
                />
              </div>
              <Select value={currentFilter} onValueChange={(value) => setCurrentFilter(value as DocumentationStatus | "all")}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value={DocumentationStatus.PENDING}>Offen</SelectItem>
                  <SelectItem value={DocumentationStatus.REVIEW}>In Überprüfung</SelectItem>
                  <SelectItem value={DocumentationStatus.COMPLETED}>Abgeschlossen</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortOrder(current => current === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                onClick={() => setSelectedPatient(null)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Dokumentation
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-[350px,1fr] gap-6">
            {/* Left Sidebar - Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Patienten</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-4 space-y-2">
                    {patients.map((patient) => (
                      <Button
                        key={patient.id}
                        variant="ghost"
                        className="w-full justify-start p-3 h-auto"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Heart className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
                                PG {patient.careLevel}
                              </Badge>
                              {patient.lastVisit && (
                                <span className="text-xs">
                                  Letzter Besuch: {format(new Date(patient.lastVisit), "dd.MM.yy", { locale: de })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Main Documentation Area */}
            <div className="space-y-6">
              {selectedPatient ? (
                <>
                  {/* Patient Context Card */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold mb-2">{selectedPatient.name}</h2>
                          <div className="flex items-center gap-4">
                            <Badge variant={selectedPatient.careLevel >= 4 ? "destructive" : "secondary"}>
                              Pflegegrad {selectedPatient.careLevel}
                            </Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {selectedPatient.lastVisit && format(new Date(selectedPatient.lastVisit), "dd.MM.yyyy", { locale: de })}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                          <ArrowLeft className="h-4 w-4 mr-1"/> Zurück zur Übersicht
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documentation Creation Tabs */}
                  <Card>
                    <CardContent className="p-6">
                      <Tabs defaultValue="quick" className="w-full">
                        <TabsList className="grid grid-cols-3 gap-4 mb-6">
                          <TabsTrigger value="quick" onClick={() => setDocumentationType('quick')}>
                            <div className="flex items-center gap-2">
                              <Mic className="h-4 w-4" />
                              Schnelldokumentation
                            </div>
                          </TabsTrigger>
                          <TabsTrigger value="template" onClick={() => setDocumentationType('template')}>
                            <div className="flex items-center gap-2">
                              <ListChecks className="h-4 w-4" />
                              Vorlagen
                            </div>
                          </TabsTrigger>
                          <TabsTrigger value="form" onClick={() => setDocumentationType('form')}>
                            <div className="flex items-center gap-2">
                              <PenSquare className="h-4 w-4" />
                              Formular
                            </div>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="quick">
                          <VoiceRecorder
                            onTranscriptionComplete={handleTranscriptionComplete}
                            patientContext={{
                              careLevel: selectedPatient.careLevel,
                              lastVisit: selectedPatient.lastVisit,
                            }}
                          />
                        </TabsContent>

                        <TabsContent value="template">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Template buttons will go here */}
                          </div>
                        </TabsContent>

                        <TabsContent value="form">
                          {/* Structured form will go here */}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Recent Documentation */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Letzte Dokumentationen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {allDocs
                            .filter(doc => doc.patientId === selectedPatient.id)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(doc => (
                              <Card key={doc.id} className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">
                                      {format(new Date(doc.date), "dd.MM.yyyy HH:mm", { locale: de })}
                                    </span>
                                  </div>
                                  <Badge variant={doc.status === "completed" ? "default" : "secondary"}>
                                    {doc.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{doc.content}</p>
                                {doc.aiGenerated && (
                                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                                    <Brain className="h-3 w-3" />
                                    <span>KI-unterstützt</span>
                                  </div>
                                )}
                              </Card>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium mb-2">Wählen Sie einen Patienten aus</h3>
                      <p className="text-gray-500">
                        Wählen Sie einen Patienten aus der Liste links, um mit der Dokumentation zu beginnen.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DocumentationPage;