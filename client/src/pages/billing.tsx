import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsuranceBilling, Patient } from "@shared/schema";
import { FileText, Plus, Download, Search, Calendar, Filter, Clock, Euro, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BillingEditor } from "@/components/billing/billing-editor";
import { motion, AnimatePresence } from "framer-motion";
import { BillingCard } from "@/components/billing/billing-card";
import { DocumentationCheckDialog } from "@/components/billing/documentation-check-dialog";

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewBillingOpen, setIsNewBillingOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [missingDocs, setMissingDocs] = useState<Array<{
    id: number;
    date: string;
    type: string;
  }>>([]);
  const [showDocCheck, setShowDocCheck] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [], isError: isPatientsError } = useQuery({
    queryKey: ["/api/patients"],
    retry: false,
    throwOnError: false,
  });

  const { data: billings = [], isError: isBillingsError } = useQuery({
    queryKey: ["/api/billings", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
    retry: false,
    throwOnError: false,
  });

  const { refetch: refetchDocCheck } = useQuery({
    queryKey: ["/api/documentation/check", selectedPatient?.id],
    enabled: false,
  });

  const filteredPatients = patients && searchQuery
    ? (patients as Patient[]).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.insuranceNumber.includes(searchQuery) ||
        p.insuranceProvider.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (patients as Patient[]);

  const groupedBillings = billings && Array.isArray(billings) 
    ? (billings as InsuranceBilling[]).reduce((acc, billing) => {
        const month = format(new Date(billing.date), "yyyy-MM");
        if (!acc[month]) acc[month] = [];
        acc[month].push(billing);
        return acc;
      }, {} as Record<string, InsuranceBilling[]>)
    : {};

  const selectedMonthTotal = (groupedBillings[selectedMonth] || [])
    .reduce((sum, billing) => sum + Number(billing.totalAmount), 0);

  const createBilling = useMutation({
    mutationFn: async (billing: Partial<InsuranceBilling>) => {
      if (!billing.date || !billing.services || !billing.totalAmount) {
        throw new Error('Ungültige Abrechnungsdaten');
      }

      const response = await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          employeeId: 1,
          date: billing.date,
          services: billing.services,
          totalAmount: billing.totalAmount.toString(),
          status: "draft"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern der Abrechnung');
      }

      return response.json();
    },
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/billings", selectedPatient?.id] }),
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] })
      ]).then(() => {
        setIsNewBillingOpen(false);
        toast({
          title: 'Gespeichert',
          description: 'Die Abrechnung wurde als Entwurf gespeichert.',
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
      queryClient.invalidateQueries({ queryKey: ["/api/billings", selectedPatient?.id] });
      toast({
        title: 'Aktualisiert',
        description: 'Der Status wurde erfolgreich aktualisiert.',
      });
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    },
  });

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
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Dokumentationen konnten nicht überprüft werden",
        variant: "destructive",
      });
    }
  };

  const handleCreateDocumentation = (item: { id: number; date: string; type: string }) => {
    window.location.href = `/documentation?patientId=${selectedPatient?.id}&date=${item.date}&type=${item.type}&id=${item.id}`;
  };

  const handleSaveBilling = (billing: Partial<InsuranceBilling>) => {
    createBilling.mutate(billing);
  };

  if (isPatientsError || isBillingsError) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-8">
            <div className="text-center text-red-600">
              Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu.
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getLastBillingDate = () => {
    if (!Array.isArray(billings) || billings.length === 0) {
      return "Keine Abrechnungen";
    }
    try {
      const sortedBillings = [...billings].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return format(new Date(sortedBillings[0].date), "dd. MMMM yyyy", { locale: de });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "Datum nicht verfügbar";
    }
  };

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
              Verwalten Sie Abrechnungen für Ihre Patienten
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Patient Selection */}
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
                        {filteredPatients.map((patient) => (
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

            {/* Billing Details */}
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
                              Letzte Abrechnung: {getLastBillingDate()}
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

                  {/* Monthly view with status updates */}
                  <Card className="border border-white/40 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-gray-800">Abrechnungen</CardTitle>
                        <div className="flex items-center gap-4">
                          <Filter className="h-4 w-4 text-gray-500" />
                          <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="border-none bg-transparent text-sm focus:ring-0"
                          >
                            {Object.keys(groupedBillings)
                              .sort((a, b) => b.localeCompare(a))
                              .map((month) => (
                                <option key={month} value={month}>
                                  {format(new Date(month), "MMMM yyyy", { locale: de })}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
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
                            {(groupedBillings[selectedMonth] || [])
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((billing) => (
                                <BillingCard
                                  key={billing.id}
                                  billing={billing}
                                  patient={selectedPatient}
                                  onSubmit={() => updateBillingStatus.mutate({
                                    billingId: billing.id,
                                    newStatus: billing.status === "draft" ? "pending" : "submitted"
                                  })}
                                />
                              ))}
                          </motion.div>
                        </AnimatePresence>

                        {/* Monthly summary */}
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-sm border-t mt-6 p-4 rounded-b-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium text-gray-700">
                              Gesamtbetrag {format(new Date(selectedMonth), "MMMM yyyy", { locale: de })}
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

          {/* Documentation Check Dialog */}
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

          {/* Billing Dialog */}
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