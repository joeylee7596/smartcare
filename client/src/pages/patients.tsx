import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PatientTable } from "@/components/patients/patient-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Activity, Pill, Calendar, FileText } from "lucide-react";
import { useState } from "react";
import { Patient } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  // Quick action cards with smart features
  const quickActions = [
    {
      title: "Vitalzeichen",
      icon: Activity,
      description: "Automatische Überwachung",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Medikamente",
      icon: Pill,
      description: "Smart Medikationsplan",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Termine",
      icon: Calendar,
      description: "KI-optimierte Planung",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Berichte",
      icon: FileText,
      description: "Automatische Dokumentation",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Patienten</h1>
              <p className="text-muted-foreground">
                {patients.length} Patienten in Betreuung
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Patient hinzufügen
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {quickActions.map((action) => (
              <Card key={action.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className={cn("p-6", action.color)}>
                  <action.icon className="h-8 w-8 mb-4" />
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Patienten suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <PatientTable patients={filteredPatients} />
        </main>
      </div>
    </div>
  );
}