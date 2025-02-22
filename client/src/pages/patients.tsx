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
  Search,
  UserPlus,
  ArrowRight,
  Clock,
  ListChecks,
  Layout,
  Grid,
  Sparkles,
  ListIcon
} from "lucide-react";
import { useState } from "react";
import { Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { PatientDetailsDialog } from "@/components/patients/patient-details-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

export default function Patients() {
  const [search, setSearch] = useState("");
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [careLevelFilter, setCareLevelFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase()) &&
    (careLevelFilter === "all" || patient.careLevel.toString() === careLevelFilter)
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
          {/* Header with Search and Filters */}
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
                  <Search className="h-5 w-5" />
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

              <Select value={careLevelFilter} onValueChange={setCareLevelFilter}>
                <SelectTrigger className="w-[180px] h-12">
                  <SelectValue placeholder="Pflegegrad Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Pflegegrade</SelectItem>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Pflegegrad {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AddPatientDialog>
                <Button 
                  size="lg"
                  className="h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                    hover:from-blue-600 hover:to-blue-700
                    text-white shadow-lg shadow-blue-500/25
                    hover:shadow-xl hover:shadow-blue-500/30
                    hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <UserPlus 
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
                        className="h-10 w-10 mb-4 transition-all duration-500 
                          group-hover:scale-110 group-hover:rotate-12" 
                      />
                      <h3 className="text-lg font-semibold">{action.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{action.subtitle}</p>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                    <ArrowRight 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 
                        transform translate-x-4 group-hover:translate-x-0
                        transition-all duration-500" 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <Card className="rounded-2xl border border-white/40 bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Patientenübersicht</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedView === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView('grid')}
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Grid
                </Button>
                <Button
                  variant={selectedView === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedView('list')}
                >
                  <ListIcon className="h-4 w-4 mr-1" />
                  Liste
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedView === 'grid' ? (
                <PatientGrid patients={filteredPatients} onSelect={setSelectedPatient} />
              ) : (
                <div className="space-y-4">
                  {filteredPatients.map((patient) => (
                    <Card
                      key={patient.id}
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <Heart className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-lg">{patient.name}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
                                Pflegegrad {patient.careLevel}
                              </Badge>
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {patient.lastVisit && format(new Date(patient.lastVisit), "dd.MM.yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Insights Card */}
          <Card className="mt-8 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <CardTitle>KI-Empfehlungen</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* AI recommendations will be dynamically loaded here */}
                <div className="text-gray-500 text-center py-4">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>KI analysiert Ihre Patientendaten...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {selectedPatient && (
        <PatientDetailsDialog
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(open) => !open && setSelectedPatient(null)}
        />
      )}
    </div>
  );
}