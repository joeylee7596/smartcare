import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PatientGrid } from "@/components/patients/patient-grid";
import { AddPatientDialog } from "@/components/patients/add-patient-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { 
  Heart, 
  CalendarPlus, 
  FileText,
  Brain,
  MagnifyingGlass,
  UserPlus,
  ArrowRight
} from "phosphor-react";
import { useState } from "react";
import { Patient } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Patients() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  const quickActions = [
    {
      title: "Dokumentation",
      subtitle: "Patientenberichte & Notizen",
      icon: FileText,
      description: "Erfassen Sie Berichte und Notizen für Ihre Patienten",
      color: "bg-gradient-to-br from-green-50/80 to-green-100/50 text-green-600 hover:from-green-100/80 hover:to-green-200/50",
      onClick: () => navigate("/documentation"),
    },
    {
      title: "Termine",
      subtitle: "Besuchsplanung",
      icon: CalendarPlus,
      description: "Planen Sie Patientenbesuche und Termine",
      color: "bg-gradient-to-br from-purple-50/80 to-purple-100/50 text-purple-600 hover:from-purple-100/80 hover:to-purple-200/50",
      onClick: () => navigate("/tours/new"),
    },
    {
      title: "KI-Analyse",
      subtitle: "Intelligente Auswertung",
      icon: Brain,
      description: "Lassen Sie die KI Patientendaten analysieren",
      color: "bg-gradient-to-br from-blue-50/80 to-blue-100/50 text-blue-600 hover:from-blue-100/80 hover:to-blue-200/50",
      onClick: () => navigate("/analysis"),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8 max-w-[1920px] mx-auto">
          {/* Header with Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Patienten
              </h1>
              <p className="text-lg text-gray-500">
                {patients.length} {patients.length === 1 ? 'Patient' : 'Patienten'} in Betreuung
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative">
                <div className="absolute left-3 top-3 text-gray-400">
                  <MagnifyingGlass weight="bold" className="h-5 w-5" />
                </div>
                <Input
                  placeholder="Patienten suchen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-12 min-w-[300px] rounded-xl bg-white/80 backdrop-blur-sm
                    border-white/40 hover:border-blue-200 focus:border-blue-300
                    shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]
                    focus:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)]
                    transition-all duration-300 text-base"
                />
              </div>
              <AddPatientDialog>
                <Button 
                  size="lg"
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                    hover:from-blue-600 hover:to-blue-700
                    text-white shadow-lg shadow-blue-500/25
                    hover:shadow-xl hover:shadow-blue-500/30
                    hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <UserPlus weight="fill" 
                    className="mr-2 h-5 w-5 transition-transform duration-300 
                      group-hover:scale-110 group-hover:rotate-12" 
                  />
                  Patient hinzufügen
                </Button>
              </AddPatientDialog>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                onClick={action.onClick}
                className="relative overflow-hidden cursor-pointer
                  transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1
                  rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                  hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]
                  border border-white/20 backdrop-blur-sm group"
              >
                <CardContent className={cn(
                  "p-6 transition-all duration-500",
                  action.color
                )}>
                  <div className="flex items-start justify-between">
                    <div>
                      <action.icon 
                        weight="fill" 
                        className="h-10 w-10 mb-4 transition-all duration-500 
                          group-hover:scale-110 group-hover:rotate-12" 
                      />
                      <h3 className="text-lg font-semibold">{action.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{action.subtitle}</p>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                    <ArrowRight 
                      weight="bold" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 
                        transform translate-x-4 group-hover:translate-x-0
                        transition-all duration-500" 
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Patient Grid */}
          <PatientGrid patients={filteredPatients} />
        </main>
      </div>
    </div>
  );
}