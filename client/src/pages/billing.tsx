import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { FileText, Plus, Download, Search, Calendar, Filter, Clock, Euro, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BillingEditor } from "@/components/billing/billing-editor";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewBillingOpen, setIsNewBillingOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const { toast } = useToast();

  // Fetch data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: billings = [], refetch: refetchBillings } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
  });

  // Filter patients based on search
  const filteredPatients = searchQuery
    ? patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.insuranceNumber.includes(searchQuery) ||
        p.insuranceProvider.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients;

  // Group billings by month
  const groupedBillings = billings.reduce((acc, billing) => {
    const month = format(new Date(billing.date), "yyyy-MM");
    if (!acc[month]) acc[month] = [];
    acc[month].push(billing);
    return acc;
  }, {} as Record<string, InsuranceBilling[]>);

  // Calculate total amount for selected month
  const selectedMonthTotal = (groupedBillings[selectedMonth] || [])
    .reduce((sum, billing) => sum + Number(billing.totalAmount), 0);

  // Handle save billing
  const handleSaveBilling = async (billing: Partial<InsuranceBilling>) => {
    try {
      if (!billing.date || !billing.services || !billing.totalAmount) {
        throw new Error('Ungültige Abrechnungsdaten');
      }

      const response = await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient?.id,
          employeeId: 1, // TODO: Get from auth context
          date: new Date(billing.date).toISOString(),
          services: billing.services,
          totalAmount: billing.totalAmount.toString(),
          status: "pending"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern der Abrechnung');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/billings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] })
      ]);

      await refetchBillings();
      setIsNewBillingOpen(false);

      toast({
        title: 'Gespeichert',
        description: 'Die Abrechnung wurde erfolgreich erstellt.',
      });
    } catch (error) {
      console.error('Saving Error:', error);
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Die Abrechnung konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    }
  };

  const generatePDF = async (billing: InsuranceBilling) => {
    try {
      const response = await fetch(`/api/billings/${billing.id}/pdf`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("PDF konnte nicht erstellt werden");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Abrechnung_${billing.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF erstellt",
        description: "Die Abrechnung wurde erfolgreich als PDF exportiert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "PDF konnte nicht erstellt werden.",
        variant: "destructive",
      });
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
                              Letzte Abrechnung: {
                                billings.length > 0
                                  ? format(new Date(billings[0].date), "dd. MMMM yyyy", { locale: de })
                                  : "Keine Abrechnungen"
                              }
                            </p>
                          </div>
                        </div>
                        <Dialog open={isNewBillingOpen} onOpenChange={setIsNewBillingOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="lg"
                              className="h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                                hover:from-blue-600 hover:to-blue-700 text-white
                                shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                                transition-all duration-500 hover:scale-[1.02]"
                            >
                              <Plus className="h-5 w-5 mr-2" />
                              Neue Leistung
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/40">
                            <DialogHeader>
                              <DialogTitle>Neue Leistung erfassen</DialogTitle>
                            </DialogHeader>
                            <BillingEditor
                              patient={selectedPatient}
                              onSave={handleSaveBilling}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Monthly view */}
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
                            {(groupedBillings[selectedMonth] || []).map((billing, index) => (
                              <motion.div
                                key={billing.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                              >
                                <Card className="group hover:shadow-lg transition-all duration-300
                                  hover:scale-[1.02] hover:-translate-y-1 rounded-xl
                                  border border-white/40 hover:border-blue-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-500" />
                                          <span className="text-sm text-gray-500">
                                            {format(new Date(billing.date), "dd. MMMM yyyy", { locale: de })}
                                          </span>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                          {billing.services.map((service, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                              <span className="text-gray-600">{service.description}</span>
                                              <span className="font-medium">
                                                {Number(service.amount).toFixed(2)} €
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generatePDF(billing)}
                                        className="h-9 rounded-xl bg-white/80 hover:bg-blue-50
                                          border border-white/40 hover:border-blue-200
                                          transition-all duration-300"
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        PDF
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
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
        </main>
      </div>
    </div>
  );
}