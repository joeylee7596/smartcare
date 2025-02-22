import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { BillingCard } from "@/components/billing/billing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { Plus, FileText, Send, CheckCircle, AlertCircle, Filter, Receipt, TrendingUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function BillingPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

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
    pending: billings.filter(b => b.status === "pending").length,
    submitted: billings.filter(b => b.status === "submitted").length,
    approved: billings.filter(b => b.status === "approved").length,
    totalAmount: billings.reduce((sum, b) => sum + Number(b.totalAmount), 0),
  };

  // Filter billings by status
  const filteredBillings = filterStatus === "all" 
    ? billings 
    : billings.filter(b => b.status === filterStatus);

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

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/50 backdrop-blur-sm border-white/20">
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
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-yellow-500/10 p-3 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                    <p className="text-sm text-gray-500">Ausstehend</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-green-500/10 p-3 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                    <p className="text-sm text-gray-500">Genehmigt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/50 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="bg-blue-500/10 p-3 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.totalAmount.toFixed(2)} €
                    </p>
                    <p className="text-sm text-gray-500">Gesamtbetrag</p>
                  </div>
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

            {/* Billing List */}
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
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Neue Abrechnung
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="list" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="list">Liste</TabsTrigger>
                      <TabsTrigger value="cards">Karten</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                      <Card>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {filteredBillings.map((billing) => (
                              <div key={billing.id} className="p-4 hover:bg-gray-50">
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
                            patient={patients.find(p => p.id === billing.patientId)!}
                            onSubmit={() => submitBilling.mutate(billing.id)}
                          />
                        ))}
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