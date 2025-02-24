import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsuranceBilling, Patient, BillingStatus, BillingType } from "@shared/schema";
import {
  FileText, Plus, Search, Calendar, Filter, Clock, Euro,
  ChevronRight, Wand2, BarChart2, FileSearch, History,
  Download, Printer, Settings2
} from "lucide-react";
import { useState } from "react";
import { format, isValid, parseISO, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BillingEditor } from "@/components/billing/billing-editor";
import { motion, AnimatePresence } from "framer-motion";
import { BillingCard } from "@/components/billing/billing-card";
import { DocumentationCheckDialog } from "@/components/billing/documentation-check-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRangePicker } from "@/components/ui/date-range-picker"; // Added import


// Hilfsfunktion für sichere Datumsformatierung
const formatSafeDate = (dateString: string | Date | null | undefined, defaultValue: string = "Nicht verfügbar"): string => {
  if (!dateString) return defaultValue;
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? format(date, "dd. MMMM yyyy", { locale: de }) : defaultValue;
  } catch (error) {
    console.error('Date formatting error:', error);
    return defaultValue;
  }
};

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewBillingOpen, setIsNewBillingOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subMonths(new Date(), 1),
    to: new Date()
  });

  const [missingDocs, setMissingDocs] = useState<Array<{
    id: number;
    date: string;
    type: string;
  }>>([]);
  const [showDocCheck, setShowDocCheck] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Patienten laden
  const { data: patients = [], isError: isPatientsError } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    retry: 2,
    staleTime: 30000,
  });

  // Abrechnungen laden
  const { data: billings = [], isError: isBillingsError } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    retry: 2,
    staleTime: 30000,
  });

  // Analytics Data Query
  const { data: analyticsData } = useQuery({
    queryKey: ["/api/analytics/billing", selectedDateRange],
    enabled: showAnalytics,
  });

  const { refetch: refetchDocCheck } = useQuery({
    queryKey: ["/api/documentation/check", selectedPatient?.id],
    enabled: false,
  });

  // KI-Vorschläge laden
  const { data: aiSuggestions } = useQuery({
    queryKey: ["/api/ai/billing-suggestions", selectedPatient?.id, selectedMonth],
    enabled: !!selectedPatient?.id && !!selectedMonth,
  });

  const filteredPatients = searchQuery && Array.isArray(patients)
    ? patients.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.insuranceNumber.includes(searchQuery) ||
      p.insuranceProvider.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : patients;

  const groupedBillings = (() => {
    if (!Array.isArray(billings)) return {};

    return billings.reduce<Record<string, InsuranceBilling[]>>((acc, billing) => {
      if (!billing?.date) return acc;

      try {
        const date = parseISO(billing.date);
        if (!isValid(date)) return acc;

        const month = format(date, "yyyy-MM");
        if (!acc[month]) acc[month] = [];
        acc[month].push(billing);
      } catch (error) {
        console.error('Error processing billing date:', error);
      }
      return acc;
    }, {});
  })();

  const filteredBillings = (groupedBillings[selectedMonth] || [])
    .filter(billing =>
      (selectedStatus === "all" || billing.status === selectedStatus) &&
      (selectedType === "all" || billing.type === selectedType)
    );

  const selectedMonthTotal = filteredBillings
    .reduce((sum, billing) => sum + Number(billing.totalAmount || 0), 0);

  const createBilling = useMutation({
    mutationFn: async (billing: Partial<InsuranceBilling>) => {
      if (!billing.date || !billing.services || !billing.totalAmount) {
        throw new Error('Ungültige Abrechnungsdaten');
      }

      const response = await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billing),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern der Abrechnung');
      }

      return response.json();
    },
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/billings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/billings", selectedPatient?.id] }),
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] })
      ]).then(() => {
        setIsNewBillingOpen(false);
        toast({
          title: 'Gespeichert',
          description: 'Die Abrechnung wurde erfolgreich gespeichert.',
        });
      });
    },
    onError: (error) => {
      console.error('Saving Error:', error);
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Abrechnung konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    },
  });

  const updateBillingStatus = useMutation({
    mutationFn: async ({ billingId, newStatus }: { billingId: number; newStatus: string }) => {
      const response = await fetch(`/api/billings/${billingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Status konnte nicht aktualisiert werden');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billings", selectedPatient?.id] });
      toast({
        title: 'Aktualisiert',
        description: 'Der Status wurde erfolgreich aktualisiert.',
      });
    },
  });

  const optimizeBilling = useMutation({
    mutationFn: async (billingId: number) => {
      const response = await fetch(`/api/ai/billing-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingId }),
      });

      if (!response.ok) throw new Error('Optimierung fehlgeschlagen');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billings", selectedPatient?.id] });
      toast({
        title: 'Optimiert',
        description: 'Die Abrechnung wurde erfolgreich optimiert.',
      });
    },
  });

  const handleOptimize = (billingId: number) => {
    optimizeBilling.mutate(billingId);
  };

  const checkMissingDocumentation = async () => {
    if (!selectedPatient) return;

    try {
      const result = await refetchDocCheck();
      const missingDocs = result.data?.missingDocs || [];
      if (missingDocs.length > 0) {
        setMissingDocs(missingDocs);
        setShowDocCheck(true);
      } else {
        setIsNewBillingOpen(true);
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        toast({
          title: "Keine Dokumentation gefunden",
          description: "Möchten Sie eine neue Dokumentation anlegen?",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = format(new Date(), "yyyy-MM-dd");
                window.location.href = `/documentation?patientId=${selectedPatient.id}&date=${today}&type=tour`;
              }}
            >
              Dokumentation anlegen
            </Button>
          ),
        });
      } else {
        toast({
          title: "Dokumentationsprüfung fehlgeschlagen",
          description: "Bitte versuchen Sie es später erneut oder erstellen Sie eine neue Dokumentation.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateDocumentation = (item: { id: number; date: string; type: string }) => {
    window.location.href = `/documentation?patientId=${selectedPatient?.id}&date=${item.date}&type=${item.type}&id=${item.id}`;
  };

  const handleSaveBilling = (billing: Partial<InsuranceBilling>) => {
    createBilling.mutate(billing);
  };

  if (isPatientsError && isBillingsError) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-8">
            <div className="text-center space-y-4">
              <div className="text-red-600 font-medium">
                Es ist ein kritischer Fehler aufgetreten.
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Seite neu laden
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Abrechnung
            </h1>
            <p className="text-lg text-gray-500">
              Effiziente Verwaltung von Abrechnungen mit KI-Unterstützung
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="overview" className="relative">
                  <FileText className="h-4 w-4 mr-2" />
                  Übersicht
                </TabsTrigger>
                <TabsTrigger value="drafts">
                  <FileSearch className="h-4 w-4 mr-2" />
                  Entwürfe
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Verlauf
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Analyse
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportieren
                </Button>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Einstellungen
                </Button>
              </div>
            </div>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <Card className="overflow-hidden border border-white/40 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between">
                        <span>Patienten</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          className="pl-9 h-11 rounded-xl bg-white/80
                            border-white/40 hover:border-blue-200 focus:border-blue-300
                            shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]
                            focus:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)]
                            transition-all duration-300"
                          placeholder="Patient suchen..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <ScrollArea className="h-[calc(100vh-320px)]">
                        <AnimatePresence>
                          <motion.div
                            className="space-y-2 pr-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            {Array.isArray(filteredPatients) && filteredPatients.map((patient) => (
                              <motion.div
                                key={patient.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Card
                                  className={`cursor-pointer transition-all duration-300
                                    hover:scale-[1.02] hover:-translate-y-1
                                    group ${
                                      selectedPatient?.id === patient.id
                                        ? "border-blue-500 shadow-blue-100"
                                        : "border-white/40 hover:border-blue-200"
                                    }`}
                                  onClick={() => setSelectedPatient(patient)}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h3 className="font-medium">{patient.name}</h3>
                                        <div className="space-y-1 mt-1">
                                          <p className="text-sm text-gray-500">
                                            {patient.insuranceProvider}
                                          </p>
                                          <p className="text-sm text-gray-500">
                                            VersNr: {patient.insuranceNumber}
                                          </p>
                                        </div>
                                      </div>
                                      <ChevronRight className="h-5 w-5 text-gray-400
                                        opacity-0 group-hover:opacity-100
                                        transform translate-x-4 group-hover:translate-x-0
                                        transition-all duration-500" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-12 lg:col-span-8">
                  {selectedPatient ? (
                    <div className="space-y-6">
                      <Card className="border border-white/40 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                                {selectedPatient.name}
                              </CardTitle>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Adresse: {selectedPatient.address}
                                </p>
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Letzte Abrechnung: {format(new Date(), "dd. MMMM yyyy", { locale: de })}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="lg"
                              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                                hover:from-blue-600 hover:to-blue-700 text-white
                                shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                                transition-all duration-500 hover:scale-[1.02]"
                              onClick={checkMissingDocumentation}
                            >
                              <Plus className="h-5 w-5 mr-2" />
                              Neue Leistung
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>

                      <Card className="border border-white/40 backdrop-blur-sm">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-gray-800">Abrechnungen</CardTitle>
                            <div className="flex items-center gap-4">
                              <Select
                                value={selectedStatus}
                                onValueChange={setSelectedStatus}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Alle Status</SelectItem>
                                  <SelectItem value={BillingStatus.DRAFT}>Entwürfe</SelectItem>
                                  <SelectItem value={BillingStatus.PENDING}>In Bearbeitung</SelectItem>
                                  <SelectItem value={BillingStatus.SUBMITTED}>Eingereicht</SelectItem>
                                  <SelectItem value={BillingStatus.PAID}>Bezahlt</SelectItem>
                                  <SelectItem value={BillingStatus.REJECTED}>Abgelehnt</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={selectedType}
                                onValueChange={setSelectedType}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue placeholder="Typ" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Alle Typen</SelectItem>
                                  <SelectItem value={BillingType.INSURANCE}>Krankenkasse</SelectItem>
                                  <SelectItem value={BillingType.PRIVATE}>Privatrechnung</SelectItem>
                                </SelectContent>
                              </Select>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy", { locale: de })}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <CalendarComponent
                                    mode="single"
                                    selected={parseISO(`${selectedMonth}-01`)}
                                    onSelect={(date) => date && setSelectedMonth(format(date, "yyyy-MM"))}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {aiSuggestions?.suggestions?.length > 0 && (
                            <div className="mt-4 bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                              <Wand2 className="h-5 w-5 text-blue-500" />
                              <span className="text-sm text-blue-700">
                                {aiSuggestions.suggestions.length} KI-Vorschläge verfügbar
                              </span>
                              <Button
                                variant="link"
                                className="text-blue-600 text-sm"
                                onClick={() => {/* TODO: Show AI suggestions dialog */}}
                              >
                                Anzeigen
                              </Button>
                            </div>
                          )}
                        </CardHeader>

                        <CardContent>
                          <ScrollArea className="h-[calc(100vh-500px)]">
                            <AnimatePresence>
                              <motion.div
                                className="space-y-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                {filteredBillings.map((billing) => (
                                  <BillingCard
                                    key={billing.id}
                                    billing={billing}
                                    patient={selectedPatient}
                                    onSubmit={() => updateBillingStatus.mutate({
                                      billingId: billing.id,
                                      newStatus: billing.status === "draft" ? "pending" : "submitted"
                                    })}
                                    onOptimize={() => handleOptimize(billing.id)}
                                  />
                                ))}

                                {filteredBillings.length === 0 && (
                                  <div className="text-center py-8 text-gray-500">
                                    Keine Abrechnungen für den ausgewählten Zeitraum und Filter
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>

                            <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t mt-6 p-4 rounded-b-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-medium text-gray-700">
                                  Gesamtbetrag {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy", { locale: de })}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Euro className="h-5 w-5 text-blue-500" />
                                  <span className="text-xl font-bold text-blue-600">
                                    {selectedMonthTotal.toFixed(2)} €
                                  </span>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="h-full border border-white/40 backdrop-blur-sm flex items-center justify-center">
                      <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium text-gray-700">Kein Patient ausgewählt</p>
                        <p className="text-sm text-gray-500">
                          Wählen Sie einen Patienten aus der Liste aus
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-4">
              <Card className="border border-white/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Aktuelle Entwürfe</CardTitle>
                    <Button onClick={checkMissingDocumentation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Abrechnung
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(billings) && billings
                      .filter(b => b.status === BillingStatus.DRAFT)
                      .map(billing => (
                        <BillingCard
                          key={billing.id}
                          billing={billing}
                          patient={patients.find(p => p.id === billing.patientId) as Patient}
                          onSubmit={() => updateBillingStatus.mutate({
                            billingId: billing.id,
                            newStatus: "pending"
                          })}
                          onOptimize={() => handleOptimize(billing.id)}
                        />
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="border border-white/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Abrechnungsverlauf</CardTitle>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedType}
                        onValueChange={setSelectedType}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Typ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Typen</SelectItem>
                          <SelectItem value={BillingType.INSURANCE}>Krankenkasse</SelectItem>
                          <SelectItem value={BillingType.PRIVATE}>Privatrechnung</SelectItem>
                        </SelectContent>
                      </Select>
                      <DateRangePicker
                        selected={selectedDateRange}
                        onSelect={setSelectedDateRange}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-4">
                      {Array.isArray(billings) && billings
                        .filter(b => b.status !== BillingStatus.DRAFT)
                        .sort((a, b) => {
                          if (!a.date || !b.date) return 0;
                          const dateA = parseISO(a.date);
                          const dateB = parseISO(b.date);
                          return isValid(dateB) && isValid(dateA)
                            ? dateB.getTime() - dateA.getTime()
                            : 0;
                        })
                        .map(billing => (
                          <BillingCard
                            key={billing.id}
                            billing={billing}
                            patient={patients.find(p => p.id === billing.patientId) as Patient}
                            onSubmit={() => updateBillingStatus.mutate({
                              billingId: billing.id,
                              newStatus: billing.status === "pending" ? "submitted" : billing.status
                            })}
                          />
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Gesamtumsatz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsData?.totalRevenue?.toFixed(2)} €
                    </div>
                    <p className="text-sm text-gray-500">
                      Letzte 30 Tage
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Offene Abrechnungen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {analyticsData?.pendingCount || 0}
                    </div>
                    <p className="text-sm text-gray-500">
                      Aktuell in Bearbeitung
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Erfolgsquote</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsData?.successRate?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-500">
                      Angenommene Abrechnungen
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-white/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Abrechnungsstatistiken</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    {/* TODO: Add charts using Recharts */}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>KI-Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.aiInsights?.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                        <Wand2 className="h-5 w-5 text-blue-500 mt-1" />
                        <div>
                          <h4 className="font-medium text-blue-900">{insight.title}</h4>
                          <p className="text-sm text-blue-700">{insight.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DocumentationCheckDialog
            open={showDocCheck}
            onOpenChange={setShowDocCheck}
            onProceed={() => {
              setShowDocCheck(false);
              setIsNewBillingOpen(true);
            }}
            onCreateDocumentation={handleCreateDocumentation}
            missingDocs={missingDocs}
            patientName={selectedPatient?.name || ""}
          />

          <Dialog open={isNewBillingOpen} onOpenChange={setIsNewBillingOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Neue Leistung erfassen</DialogTitle>
              </DialogHeader>
              {selectedPatient && (
                <BillingEditor
                  patient={selectedPatient}
                  onSave={handleSaveBilling}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}