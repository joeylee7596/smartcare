import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { BillingCard } from "@/components/billing/billing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { Plus, FileText, Send, CheckCircle2, AlertCircle, Filter, Receipt, TrendingUp, PieChart, ArrowUpRight, Clock, Euro, X } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BillingEditor } from "@/components/billing/billing-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";


export default function BillingPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedBilling, setSelectedBilling] = useState<InsuranceBilling | null>(null);
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm();


  // Fetch data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: billings = [] } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings", selectedPatientId],
    enabled: !!selectedPatientId,
  });

  // AI recommendations
  const { data: aiRecommendations } = useQuery({
    queryKey: ["/api/ai/billing-optimization", selectedPatientId],
    queryFn: async () => {
      const response = await fetch("/api/ai/billing-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatientId,
          billings: billings,
        }),
      });
      if (!response.ok) throw new Error("Failed to get AI recommendations");
      return response.json();
    },
    enabled: !!selectedPatientId && billings.length > 0,
  });

  // Submit billing mutation
  const submitBilling = useMutation({
    mutationFn: async (billingId: number) => {
      const response = await fetch(`/api/billings/${billingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted" }),
      });
      if (!response.ok) throw new Error("Failed to submit billing");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
      toast({
        title: "Erfolgreich eingereicht",
        description: "Die Abrechnung wurde an die Krankenkasse übermittelt.",
      });
    },
  });

  // Calculate statistics
  const stats = {
    total: billings.length,
    pending: billings.filter((b) => b.status === "pending").length,
    submitted: billings.filter((b) => b.status === "submitted").length,
    approved: billings.filter((b) => b.status === "approved").length,
    totalAmount: billings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
  };

  // Filter billings by status
  const filteredBillings =
    filterStatus === "all" ? billings : billings.filter((b) => b.status === filterStatus);

  const [services, setServices] = useState([{ description: "", amount: 0 }]);

  const addService = () => {
    setServices([...services, { description: "", amount: 0 }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, updates: Partial<{ description: string; amount: number }>) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], ...updates };
    setServices(newServices);
  };

  const handleCreateBilling = async (data: any) => {
    try {
      const response = await fetch('/api/billings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, services }),
      });

      if (!response.ok) {
        throw new Error('Failed to create billing');
      }
      const newBilling = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/billings'] });
      toast({
        title: 'Abrechnung erstellt',
        description: 'Die Abrechnung wurde erfolgreich erstellt.',
      });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating billing:', error);
      toast({
        title: 'Fehler',
        description: 'Die Abrechnung konnte nicht erstellt werden.',
        variant: 'destructive',
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
              Abrechnung & Rechnungsmanagement
            </h1>
            <p className="text-lg text-gray-500">
              Verwalten Sie Abrechnungen und optimieren Sie Ihren Workflow
            </p>
          </div>

          {/* Enhanced Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/50 backdrop-blur-sm border-white/20 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-blue-500/10 p-3 rounded-xl">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-sm text-gray-500">Gesamt Abrechnungen</p>
                  </div>
                </div>
                {/* Trend indicator */}
                <div className="absolute bottom-2 right-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12% vs. Vormonat
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-yellow-500/10 p-3 rounded-xl">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-yellow-600">
                      {stats.pending}
                    </p>
                    <p className="text-sm text-gray-500">Ausstehend</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-yellow-600">
                  Durchschnittliche Bearbeitungszeit: 3.2 Tage
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-green-500/10 p-3 rounded-xl">
                    <Euro className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.approved}
                    </p>
                    <p className="text-sm text-gray-500">Genehmigt</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-green-600">
                  Erfolgsquote: {((stats.approved / stats.total) * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20 relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-blue-500/10 p-3 rounded-xl">
                    <PieChart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.totalAmount.toFixed(2)} €
                    </p>
                    <p className="text-sm text-gray-500">Gesamtbetrag</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  Ø {(stats.totalAmount / stats.total).toFixed(2)} € pro Abrechnung
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Patient Selection */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Patienten
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-200 ${
                          selectedPatientId === patient.id
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        {patient.name}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              {selectedPatientId && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-blue-700">
                      KI-Empfehlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-blue-600/90">
                        Basierend auf der Analyse Ihrer Abrechnungen:
                      </p>
                      <div className="rounded-md bg-white/80 backdrop-blur-sm p-3 text-sm border border-blue-100">
                        {aiRecommendations?.suggestions || "Keine Empfehlungen verfügbar."}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9 space-y-6">
              {selectedPatientId ? (
                <>
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        Abrechnungen
                      </h2>
                      <p className="text-sm text-gray-500">
                        {filteredBillings.length} Abrechnungen gefunden
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/20 p-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-transparent border-none text-sm focus:ring-0"
                        >
                          <option value="all">Alle Status</option>
                          <option value="pending">Ausstehend</option>
                          <option value="submitted">Eingereicht</option>
                          <option value="approved">Genehmigt</option>
                          <option value="rejected">Abgelehnt</option>
                        </select>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Neue Abrechnung
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Neue Abrechnung erstellen</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit(handleCreateBilling)}>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="patient">Patient</Label>
                                <Select>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Patient auswählen" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {patients.map((patient) => (
                                      <SelectItem key={patient.id} value={String(patient.id)}>
                                        {patient.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="billingPeriod">Abrechnungszeitraum</Label>
                                <div className="grid grid-cols-2 gap-4">
                                  <Input type="date" {...register("startDate")} />
                                  <Input type="date" {...register("endDate")} />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="services">Leistungen</Label>
                                <div className="space-y-2">
                                  {services.map((service, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input
                                        placeholder="Beschreibung"
                                        {...register(`services.${index}.description`)}
                                      />
                                      <Input
                                        type="number"
                                        placeholder="Betrag"
                                        {...register(`services.${index}.amount`)}
                                        className="w-32"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeService(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    onClick={addService}
                                    className="w-full"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Leistung hinzufügen
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button type="submit">Abrechnung erstellen</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Tabs defaultValue="list" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="list">Liste</TabsTrigger>
                      <TabsTrigger value="cards">Karten</TabsTrigger>
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="analytics">Analyse</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                      <Card>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {filteredBillings.map((billing) => (
                              <div
                                key={billing.id}
                                className="p-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setSelectedBilling(billing)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Rechnung #{billing.id}</p>
                                    <p className="text-sm text-gray-500">
                                      {format(new Date(billing.date), "dd. MMMM yyyy", { locale: de })}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="font-medium">{billing.totalAmount} €</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => submitBilling.mutate(billing.id)}
                                      disabled={billing.status !== "pending"}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Einreichen
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="cards">
                      <div className="grid gap-6 md:grid-cols-2">
                        {filteredBillings.map((billing) => (
                          <BillingCard
                            key={billing.id}
                            billing={billing}
                            patient={patients.find((p) => p.id === billing.patientId)!}
                            onSubmit={() => submitBilling.mutate(billing.id)}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="editor">
                      <div className="space-y-6">
                        {selectedBilling ? (
                          <BillingEditor
                            billing={selectedBilling}
                            patient={patients.find((p) => p.id === selectedBilling.patientId)!}
                            onSave={async (updates) => {
                              try {
                                const response = await fetch(`/api/billings/${selectedBilling.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(updates),
                                });
                                if (!response.ok) throw new Error("Fehler beim Speichern");
                                queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
                                toast({
                                  title: "Gespeichert",
                                  description: "Die Änderungen wurden erfolgreich gespeichert.",
                                });
                              } catch (error) {
                                toast({
                                  title: "Fehler",
                                  description: "Die Änderungen konnten nicht gespeichert werden.",
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg font-medium">Keine Abrechnung ausgewählt</p>
                            <p className="text-sm text-gray-500">
                              Wählen Sie eine Abrechnung aus der Liste aus oder erstellen Sie eine neue
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="analytics">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle>Abrechnungsanalyse</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-6">
                              {/* Payment Trends */}
                              <div>
                                <h3 className="text-lg font-medium mb-4">Zahlungstrends</h3>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="p-4 rounded-lg bg-green-50">
                                    <p className="text-sm text-green-600">Pünktliche Zahlungen</p>
                                    <p className="text-2xl font-bold text-green-700">92%</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-yellow-50">
                                    <p className="text-sm text-yellow-600">Durchschnittliche Verzögerung</p>
                                    <p className="text-2xl font-bold text-yellow-700">4.2 Tage</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-blue-50">
                                    <p className="text-sm text-blue-600">Erfolgsquote</p>
                                    <p className="text-2xl font-bold text-blue-700">96%</p>
                                  </div>
                                </div>
                              </div>

                              {/* Common Issues */}
                              <div>
                                <h3 className="text-lg font-medium mb-4">Häufige Probleme</h3>
                                <div className="space-y-2">
                                  {[
                                    { issue: "Fehlende Dokumentation", percentage: 45 },
                                    { issue: "Falsche Leistungscodes", percentage: 30 },
                                    { issue: "Unvollständige Patientendaten", percentage: 25 },
                                  ].map((item) => (
                                    <div key={item.issue} className="flex items-center gap-4">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{item.issue}</p>
                                        <div className="h-2 rounded-full bg-gray-100 mt-1">
                                          <div
                                            className="h-2 rounded-full bg-blue-500"
                                            style={{ width: `${item.percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                      <span className="text-sm text-gray-500">{item.percentage}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* AI Recommendations */}
                              <div>
                                <h3 className="text-lg font-medium mb-4">KI-Empfehlungen</h3>
                                <div className="space-y-4">
                                  <Card className="bg-gradient-to-br from-blue-50 to-blue-50/50">
                                    <CardContent className="p-4">
                                      <p className="text-sm text-blue-700">
                                        Basierend auf der Analyse Ihrer Abrechnungsdaten empfehlen wir:
                                      </p>
                                      <ul className="mt-2 space-y-2 text-sm text-blue-600">
                                        <li className="flex items-center gap-2">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Dokumentation vor Einreichung doppelt prüfen
                                        </li>
                                        <li className="flex items-center gap-2">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Leistungscodes standardisieren
                                        </li>
                                        <li className="flex items-center gap-2">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Automatische Erinnerungen für ausstehende Dokumente einrichten
                                        </li>
                                      </ul>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Keine Abrechnung ausgewählt</p>
                  <p className="text-sm text-gray-500">
                    Bitte wählen Sie einen Patienten aus der Liste aus
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