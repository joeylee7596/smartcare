import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc, DocumentationStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Check, 
  Clock, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Sparkles,
  Filter,
  SortAsc,
  SortDesc,
  Search,
  Calendar,
  FileText,
  MessageSquare,
  Heart,
  History,
  Trash2,
  MoreVertical
} from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceRecorder } from "@/components/documentation/voice-recorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/documentation/confirmation-dialog";
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function DocumentationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentationStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [, params] = useLocation();

  // Get patientId from URL if provided
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const patientId = searchParams.get('patient');
    if (patientId) {
      setActivePatientId(parseInt(patientId));
    }
  }, []);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: allDocs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/docs"],
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/templates", activePatientId],
    enabled: !!activePatientId,
  });

  const { data: careAnalysis = null } = useQuery({
    queryKey: ["/api/analysis", activePatientId],
    enabled: !!activePatientId,
  });

  // Filter and sort docs
  const filteredDocs = allDocs
    .filter(doc => {
      const matchesSearch = doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patients.find(p => p.id === doc.patientId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

  const docsByStatus = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.status]) {
      acc[doc.status] = [];
    }
    acc[doc.status].push(doc);
    return acc;
  }, {} as Record<typeof DocumentationStatus, Doc[]>);

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
    if (!activePatientId) return;

    try {
      const newDoc = await createDocMutation.mutateAsync({
        content: text,
        patientId: activePatientId,
        type: "KI-Dokumentation",
        status: sendToReview ? DocumentationStatus.REVIEW : DocumentationStatus.PENDING,
      });

      if (newDoc) {
        setActivePatientId(null);
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

  const handleTemplateUse = async (templateContent: string) => {
    if (!activePatientId) return;

    try {
      const newDoc = await createDocMutation.mutateAsync({
        content: templateContent,
        patientId: activePatientId,
        type: "KI-Vorlage",
        status: DocumentationStatus.PENDING,
      });

      if (newDoc) {
        setActivePatientId(null);
        setSelectedTemplate("");
        toast({ 
          title: "Vorlage angewendet", 
          description: "Die Vorlage wurde erfolgreich angewendet." 
        });
        sendMessage({ 
          type: 'DOC_STATUS_UPDATE', 
          docId: newDoc.id, 
          status: newDoc.status 
        });
        queryClient.invalidateQueries({ queryKey: ["/api/docs"] });
      }
    } catch (error) {
      console.error("Failed to use template:", error);
      toast({ 
        title: "Fehler", 
        description: error instanceof Error ? error.message : "Die Vorlage konnte nicht angewendet werden.", 
        variant: "destructive" 
      });
    }
  };

  const activePatient = patients.find(p => p.id === activePatientId);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8 max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Dokumentation
              </h1>
              <p className="text-lg text-gray-500">
                Intelligente Dokumentationsverwaltung mit KI-Unterstützung
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Dokumentation suchen..."
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentationStatus | "all")}>
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
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Column 
              title="Offen" 
              icon={<Clock className="h-5 w-5" />}
              count={docsByStatus[DocumentationStatus.PENDING]?.length || 0}
              color="blue"
            >
              {activePatientId ? (
                <Card className="p-4 border-blue-200/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{activePatient?.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">Pflegegrad {activePatient?.careLevel}</Badge>
                        {careAnalysis?.riskAreas?.length > 0 && (
                          <Badge variant="destructive">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Risikobereiche
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActivePatientId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  {careAnalysis && (
                    <div className="mb-4 p-3 rounded-lg bg-blue-50/50 border border-blue-200/20">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        KI-Analyse
                      </h4>
                      {careAnalysis.suggestions?.length > 0 && (
                        <ul className="text-sm space-y-1 text-gray-600">
                          {careAnalysis.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-blue-400" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <Tabs defaultValue="voice" className="mb-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="voice">Spracheingabe</TabsTrigger>
                      <TabsTrigger value="templates">Vorlagen</TabsTrigger>
                    </TabsList>
                    <TabsContent value="voice">
                      <VoiceRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        patientContext={{
                          careLevel: activePatient?.careLevel,
                          lastVisit: activePatient?.lastVisit,
                        }}
                      />
                    </TabsContent>
                    <TabsContent value="templates">
                      <div className="space-y-2">
                        {loadingTemplates ? (
                          <p>Lade Vorlagen...</p>
                        ) : templates.length === 0 ? (
                          <p>Keine Vorlagen verfügbar.</p>
                        ) : (
                          templates.map((template: any, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              className="w-full justify-start text-left"
                              onClick={() => setSelectedTemplate(template.content)}
                            >
                              <div>
                                <div className="font-medium">{template.type}</div>
                                <div className="text-sm text-gray-500">
                                  ~{template.suggestedDuration} Min.
                                </div>
                              </div>
                            </Button>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {selectedTemplate && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleTemplateUse(selectedTemplate)}
                    >
                      Vorlage verwenden
                    </Button>
                  )}
                </Card>
              ) : (
                <>
                  {docsByStatus[DocumentationStatus.PENDING]?.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      patient={patients.find(p => p.id === doc.patientId)!}
                      onMoveForward={() => moveDoc(doc.id, doc.status as typeof DocumentationStatus, 'forward')}
                      showMoveForward
                      color="blue"
                      onSelect={() => setSelectedDoc(doc)}
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
                  onMoveForward={() => moveDoc(doc.id, doc.status as typeof DocumentationStatus, 'forward')}
                  onMoveBackward={() => moveDoc(doc.id, doc.status as typeof DocumentationStatus, 'backward')}
                  showMoveForward
                  showMoveBackward
                  color="amber"
                  onSelect={() => setSelectedDoc(doc)}
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
                  onMoveBackward={() => moveDoc(doc.id, doc.status as typeof DocumentationStatus, 'backward')}
                  showMoveBackward
                  color="green"
                  onSelect={() => setSelectedDoc(doc)}
                />
              ))}
            </Column>
          </div>

          <AnimatePresence>
            {selectedDoc && (
              <ConfirmationDialog
                key="confirmation-dialog"
                isOpen={!!selectedDoc}
                onClose={() => setSelectedDoc(null)}
                documentation={selectedDoc.content}
                onConfirm={(text, sendToReview) => {
                  moveDoc(
                    selectedDoc.id,
                    selectedDoc.status as typeof DocumentationStatus,
                    sendToReview ? 'forward' : 'backward'
                  );
                  setSelectedDoc(null);
                }}
              />
            )}
          </AnimatePresence>
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
  onSelect: () => void;
}

function DocumentCard({ 
  doc, 
  patient,
  onMoveForward,
  onMoveBackward,
  showMoveForward,
  showMoveBackward,
  color,
  onSelect
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
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${variant.iconBg} ${variant.icon}
              transition-all duration-500 group-hover:scale-110 group-hover:rotate-12`}>
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium">{patient.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
                  Pflegegrad {patient.careLevel}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onSelect}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                <History className="h-4 w-4 mr-2" />
                Verlauf
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-gray-50/80 rounded-lg p-3">
          <p className="text-sm line-clamp-3 text-gray-600">{doc.content}</p>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(doc.date), "dd.MM.yyyy HH:mm", { locale: de })}</span>
          </div>
          {doc.type && (
            <Badge variant="outline" className="bg-gray-50">
              {doc.type}
            </Badge>
          )}
        </div>

        <AnimatePresence>
          <motion.div 
            key="action-buttons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 mt-3"
          >
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
          </motion.div>
        </AnimatePresence>
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