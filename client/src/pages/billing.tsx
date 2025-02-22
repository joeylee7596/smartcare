import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { BillingCard } from "@/components/billing/billing-card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { InsuranceBilling, Patient } from "@shared/schema";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function BillingPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: billings = [] } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings", selectedPatientId],
    enabled: !!selectedPatientId,
  });

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
              Verwalten Sie hier Abrechnungen und Rechnungen
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Patient Selection */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Patienten</h2>
                  <div className="space-y-2">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedPatientId === patient.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        {patient.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing List */}
            <div className="lg:col-span-9 space-y-6">
              {selectedPatientId ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">
                      Abrechnungen
                    </h2>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Neue Abrechnung
                    </Button>
                  </div>
                  <div className="grid gap-6">
                    {billings.map((billing) => (
                      <BillingCard
                        key={billing.id}
                        billing={billing}
                        patient={patients.find(p => p.id === billing.patientId)!}
                        onSubmit={() => {
                          // TODO: Implement submission logic
                        }}
                      />
                    ))}
                    {billings.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        Keine Abrechnungen vorhanden
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                  Bitte wählen Sie einen Patienten aus der Liste aus
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}