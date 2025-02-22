import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PatientGrid } from "@/components/patients/patient-grid";
import { AddPatientDialog } from "@/components/patients/add-patient-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { 
  Heart as Pulse, 
  Pill as Pills, 
  CalendarPlus, 
  Note,
  MagnifyingGlass
} from "phosphor-react";
import { useState } from "react";
import { Patient } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

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
      title: "Vitalzeichen",
      icon: Pulse,
      description: "Automatische Überwachung",
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100/80",
      onClick: () => {
        toast({
          title: "KI-Analyse",
          description: "Starte Vitalzeichen-Monitoring...",
        });
      },
    },
    {
      title: "Medikamente",
      icon: Pills,
      description: "Smart Medikationsplan",
      color: "bg-green-50 text-green-600 hover:bg-green-100/80",
      onClick: () => navigate("/medication"),
    },
    {
      title: "Termine",
      icon: CalendarPlus,
      description: "KI-optimierte Planung",
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100/80",
      onClick: () => navigate("/tours/new"),
    },
    {
      title: "Berichte",
      icon: Note,
      description: "Automatische Dokumentation",
      color: "bg-orange-50 text-orange-600 hover:bg-orange-100/80",
      onClick: () => navigate("/documentation"),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Patienten
              </h1>
              <p className="text-muted-foreground">
                {patients.length} Patienten in Betreuung
              </p>
            </div>
            <AddPatientDialog />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                onClick={action.onClick}
                className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 rounded-xl shadow-lg hover:shadow-xl border-0"
              >
                <CardContent className={cn(
                  "p-6 transition-colors duration-300",
                  action.color
                )}>
                  <action.icon weight="regular" className="h-8 w-8 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass weight="regular" className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Patienten suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-shadow duration-300"
              />
            </div>
          </div>

          <PatientGrid patients={filteredPatients} />
        </main>
      </div>
    </div>
  );
}