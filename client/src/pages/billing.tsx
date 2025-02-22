import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { FileText, Plus, Download, Search, Calendar, Filter, Clock } from "lucide-react";
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

  // Generate PDF for billing
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

  const getPflegegradColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "bg-blue-100 text-blue-800",
      2: "bg-green-100 text-green-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-orange-100 text-orange-800",
      5: "bg-red-100 text-red-800",
    };
    return colors[level] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Patientenabrechnung
            </h1>
            <p className="text-lg text-gray-500">
              Verwalten Sie Abrechnungen für Ihre Patienten
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Patient List */}
            <div className="col-span-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Patient suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-4">
                  {filteredPatients.map((patient) => (
                    <Card
                      key={patient.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPatient?.id === patient.id
                          ? "border-blue-500 shadow-blue-100"
                          : ""
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
                          <Badge className={`${getPflegegradColor(patient.careLevel)}`}>
                            Pflegegrad {patient.careLevel}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Patient Details & Billing */}
            <div className="col-span-8">
              {selectedPatient ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl">{selectedPatient.name}</CardTitle>
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
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Neue Leistung
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Neue Leistung erfassen</DialogTitle>
                            </DialogHeader>
                            <BillingEditor
                              patient={selectedPatient}
                              onSave={async (billing) => {
                                try {
                                  const response = await fetch('/api/billings', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      patientId: billing.patientId,
                                      employeeId: 1, // TODO: Get from auth context
                                      date: new Date(billing.date).toISOString(),
                                      services: billing.services.map(service => ({
                                        code: service.code,
                                        description: service.description,
                                        amount: Number(service.amount)
                                      })),
                                      totalAmount: billing.totalAmount.toString(),
                                      status: "pending"
                                    }),
                                  });

                                  if (!response.ok) {
                                    const errorData = await response.json();
                                    console.error("Server Error:", errorData);
                                    throw new Error(errorData.error || 'Fehler beim Speichern der Abrechnung');
                                  }

                                  await queryClient.invalidateQueries({ 
                                    queryKey: ["/api/billings", selectedPatient?.id] 
                                  });
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
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Monthly view */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Abrechnungen</CardTitle>
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
                      <div className="space-y-4">
                        {(groupedBillings[selectedMonth] || []).map((billing) => (
                          <div key={billing.id} className="border rounded-lg p-4">
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
                                      <span>{service.description}</span>
                                      <span className="font-medium">{Number(service.amount).toFixed(2)} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generatePDF(billing)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Monthly summary */}
                        <div className="border-t pt-4 mt-6">
                          <div className="flex items-center justify-between text-lg font-medium">
                            <span>Gesamtbetrag {format(new Date(selectedMonth), "MMMM yyyy", { locale: de })}</span>
                            <span>{selectedMonthTotal.toFixed(2)} €</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Kein Patient ausgewählt</p>
                  <p className="text-sm text-gray-500">
                    Wählen Sie einen Patienten aus der Liste aus
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}