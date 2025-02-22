import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { FileText, Plus, Download, Search, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingEditor } from "@/components/billing/billing-editor";

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isNewBillingOpen, setIsNewBillingOpen] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: billings = [] } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings", selectedPatient?.id],
    enabled: !!selectedPatient?.id,
  });

  // Filter patients based on search
  const filteredPatients = searchQuery
    ? patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.insuranceNumber.includes(searchQuery)
      )
    : patients;

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
                            <p className="text-sm text-gray-500">
                              VersNr: {patient.insuranceNumber}
                            </p>
                            <p className="text-sm text-gray-500">
                              {patient.insuranceProvider}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">
                              Pflegegrad {patient.careLevel}
                            </span>
                          </div>
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
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-500">
                              Adresse: {selectedPatient.address}
                            </p>
                            <p className="text-sm text-gray-500">
                              Notfallkontakt: {selectedPatient.emergencyContact}
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
                          <DialogContent className="max-w-4xl">
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
                                    body: JSON.stringify(billing),
                                  });
                                  if (!response.ok) throw new Error('Fehler beim Speichern');

                                  queryClient.invalidateQueries({ queryKey: ['/api/billings'] });
                                  setIsNewBillingOpen(false);
                                  toast({
                                    title: 'Gespeichert',
                                    description: 'Die Abrechnung wurde erfolgreich erstellt.',
                                  });
                                } catch (error) {
                                  toast({
                                    title: 'Fehler',
                                    description: 'Die Abrechnung konnte nicht erstellt werden.',
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

                  <Tabs defaultValue="timeline">
                    <TabsList>
                      <TabsTrigger value="timeline">Leistungsverlauf</TabsTrigger>
                      <TabsTrigger value="billing">Abrechnungen</TabsTrigger>
                      <TabsTrigger value="documents">Dokumente</TabsTrigger>
                    </TabsList>

                    <TabsContent value="timeline" className="space-y-4">
                      <Card>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {billings.map((billing) => (
                              <div key={billing.id} className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
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
                                          <span className="font-medium">{service.amount.toFixed(2)} €</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="ml-4 flex items-center gap-2">
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
                                <div className="mt-3 flex items-center gap-2 text-sm">
                                  {billing.status === "approved" ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span>Genehmigt</span>
                                    </div>
                                  ) : billing.status === "pending" ? (
                                    <div className="flex items-center gap-1 text-yellow-600">
                                      <AlertCircle className="h-4 w-4" />
                                      <span>In Bearbeitung</span>
                                    </div>
                                  ) : null}
                                  <span className="text-gray-500">
                                    Gesamtbetrag: {billing.totalAmount.toFixed(2)} €
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="billing">
                      <BillingEditor
                        patient={selectedPatient}
                        onSave={async (billing) => {
                          try {
                            const response = await fetch('/api/billings', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(billing),
                            });
                            if (!response.ok) throw new Error('Fehler beim Speichern');
                            queryClient.invalidateQueries({ queryKey: ['/api/billings'] });
                            toast({
                              title: 'Gespeichert',
                              description: 'Die Abrechnung wurde erfolgreich erstellt.',
                            });
                          } catch (error) {
                            toast({
                              title: 'Fehler',
                              description: 'Die Abrechnung konnte nicht erstellt werden.',
                              variant: 'destructive',
                            });
                          }
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="documents">
                      <Card>
                        <CardContent className="py-4">
                          <div className="space-y-4">
                            {/* TODO: Implement document management */}
                            <p className="text-sm text-gray-500">
                              Dokumentenverwaltung wird implementiert...
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
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