import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc, DocumentationStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  RefreshCw,
  Timer,
  Bookmark,
  Star,
  Activity,
  BookOpen,
  CheckCircle2,
  CircleDot,
  CircleDashed
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

function DocumentationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [documentationType, setDocumentationType] = useState<'quick' | 'template' | 'form'>('quick');
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilter, setCurrentFilter] = useState<DocumentationStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [quickTemplateFilter, setQuickTemplateFilter] = useState("all");
  const [aiQualityScore, setAiQualityScore] = useState(0);
  const [, params] = useLocation();

  // Fetch data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: allDocs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

  const quickTemplates = [
    { id: 'vital', name: 'Vitalzeichen', icon: Activity, color: 'text-blue-500' },
    { id: 'medication', name: 'Medikation', icon: Timer, color: 'text-green-500' },
    { id: 'care', name: 'Pflegemaßnahmen', icon: Heart, color: 'text-rose-500' },
    { id: 'mobility', name: 'Mobilität', icon: CircleDashed, color: 'text-amber-500' },
    { id: 'nutrition', name: 'Ernährung', icon: BookOpen, color: 'text-purple-500' },
    { id: 'therapy', name: 'Therapie', icon: Star, color: 'text-indigo-500' }
  ];

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
          {/* Premium Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Professionelle Dokumentation
              </h1>
              <p className="text-lg text-gray-500">
                KI-unterstützte Pflegedokumentation mit Qualitätssicherung
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Patienten oder Dokumentation suchen..."
                  className="pl-10 w-72"
                />
              </div>
              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                onClick={() => setSelectedPatient(null)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Dokumentation
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-[350px,1fr] gap-8">
            {/* Left Sidebar - Enhanced Patient Selection */}
            <div className="space-y-6">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-blue-500" />
                    Patienten
                  </CardTitle>
                  <CardDescription>
                    Wählen Sie einen Patienten für die Dokumentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="p-4 space-y-2">
                      {patients.map((patient) => (
                        <motion.div
                          key={patient.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button
                            variant="ghost"
                            className={`w-full justify-start p-3 h-auto ${
                              selectedPatient?.id === patient.id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                                <Heart className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <div className="font-medium">{patient.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
                                    PG {patient.careLevel}
                                  </Badge>
                                  {patient.lastVisit && (
                                    <span className="text-xs flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(patient.lastVisit), "dd.MM.yy", { locale: de })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Templates Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-blue-500" />
                    Schnellvorlagen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {quickTemplates.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="h-auto py-3 px-4 flex flex-col items-center justify-center gap-2"
                        disabled={!selectedPatient}
                      >
                        <template.icon className={`h-5 w-5 ${template.color}`} />
                        <span className="text-sm">{template.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Documentation Area */}
            <div className="space-y-6">
              {selectedPatient ? (
                <>
                  {/* Patient Context Card with Enhanced Information */}
                  <Card className="border-2">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4">
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

                          {/* AI Quality Score */}
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">KI-Qualitätsbewertung</span>
                                <span className="text-sm font-medium">{aiQualityScore}%</span>
                              </div>
                              <Progress value={aiQualityScore} className="h-2" />
                            </div>
                            <Badge variant="outline" className="ml-2">
                              <Brain className="h-3 w-3 mr-1" />
                              KI-Assistiert
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                          <ArrowLeft className="h-4 w-4 mr-1"/> Zurück zur Übersicht
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documentation Creation Area */}
                  <Card className="border-2">
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
                          <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-5 w-5 text-blue-600" />
                                <h3 className="font-medium">KI-Assistenz aktiv</h3>
                              </div>
                              <p className="text-sm text-blue-700">
                                Ihre Spracheingabe wird in Echtzeit analysiert und mit relevanten 
                                Patienteninformationen ergänzt.
                              </p>
                            </div>
                            <VoiceRecorder
                              onTranscriptionComplete={handleTranscriptionComplete}
                              patientContext={{
                                careLevel: selectedPatient.careLevel,
                                lastVisit: selectedPatient.lastVisit,
                              }}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="template">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Professional templates will be added here */}
                          </div>
                        </TabsContent>

                        <TabsContent value="form">
                          {/* Structured documentation form will be added here */}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>

                  {/* Recent Documentation with Enhanced Filtering */}
                  <Card className="border-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Dokumentationsverlauf</CardTitle>
                      <div className="flex items-center gap-2">
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
                          {sortOrder === "asc" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {allDocs
                            .filter(doc => doc.patientId === selectedPatient.id && (currentFilter === "all" || doc.status === currentFilter))
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(doc => (
                              <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Card className="p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 rounded-lg bg-blue-50">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          {format(new Date(doc.date), "dd.MM.yyyy HH:mm", { locale: de })}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant={
                                            doc.status === "completed" ? "default" :
                                            doc.status === "review" ? "warning" : "secondary"
                                          }>
                                            {doc.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                            {doc.status === "review" && <CircleDot className="h-3 w-3 mr-1" />}
                                            {doc.status}
                                          </Badge>
                                          {doc.aiGenerated && (
                                            <Badge variant="outline" className="bg-blue-50">
                                              <Brain className="h-3 w-3 mr-1" />
                                              KI
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      Details
                                      <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                  </div>
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-600 line-clamp-3">{doc.content}</p>
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-2">
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                        <Heart className="h-6 w-6 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Wählen Sie einen Patienten aus</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Wählen Sie einen Patienten aus der Liste links, um mit der professionellen 
                        Dokumentation zu beginnen. Unsere KI-Assistenz unterstützt Sie dabei.
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