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
  MagnifyingGlass,
  UserPlus
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
      title: "Medikamente",
      icon: Pills,
      description: "Smart Medikationsplan",
      color: "bg-gradient-to-br from-green-50/80 to-green-100/50 text-green-600 hover:from-green-100/80 hover:to-green-200/50",
      onClick: () => navigate("/medication"),
    },
    {
      title: "Termine",
      icon: CalendarPlus,
      description: "Intelligente Planung",
      color: "bg-gradient-to-br from-purple-50/80 to-purple-100/50 text-purple-600 hover:from-purple-100/80 hover:to-purple-200/50",
      onClick: () => navigate("/tours/new"),
    },
    {
      title: "Berichte",
      icon: Note,
      description: "KI-Dokumentation",
      color: "bg-gradient-to-br from-orange-50/80 to-orange-100/50 text-orange-600 hover:from-orange-100/80 hover:to-orange-200/50",
      onClick: () => navigate("/documentation"),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8 max-w-[1920px] mx-auto">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Patienten
              </h1>
              <p className="text-lg text-gray-500">
                {patients.length} Patienten in Betreuung
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AddPatientDialog>
                <Button 
                  size="lg"
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
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

          {/* Quick Actions Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
                  <action.icon 
                    weight="fill" 
                    className="h-10 w-10 mb-4 transition-all duration-500 
                      group-hover:scale-110 group-hover:rotate-12" 
                  />
                  <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <div className="absolute left-3 top-3.5 text-gray-400 transition-transform duration-300 group-focus-within:scale-110">
                <MagnifyingGlass weight="bold" className="h-5 w-5" />
              </div>
              <Input
                placeholder="Patienten suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-white/80 backdrop-blur-sm
                  border-white/40 hover:border-blue-200 focus:border-blue-300
                  shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)]
                  focus:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)]
                  transition-all duration-300 text-base group"
              />
            </div>
          </div>

          {/* Patient Grid */}
          <PatientGrid patients={filteredPatients} />
        </main>
      </div>
    </div>
  );
}