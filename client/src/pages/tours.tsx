import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MapPin,
  Users as UsersIcon,
  Clock,
  Calendar,
  Search,
  Plus,
  Brain,
  Briefcase,
  UserCheck,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterState {
  search: string;
  careLevel: string;
  availability: string;
}

export default function Tours() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    careLevel: "all",
    availability: "all"
  });
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [showNewTourDialog, setShowNewTourDialog] = useState(false);

  // Queries
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Filter tours for selected date
  const dateFilteredTours = tours.filter(tour => {
    const tourDate = parseISO(tour.date.toString());
    return tourDate >= startOfDay(selectedDate) && tourDate <= endOfDay(selectedDate);
  });

  // Calculate employee workload
  const calculateWorkload = (employeeId: number) => {
    const employeeTours = dateFilteredTours.filter(tour => tour.employeeId === employeeId);
    const totalDuration = employeeTours.reduce((sum, tour) =>
      sum + (tour.optimizedRoute?.estimatedDuration || 0), 0);
    const maxMinutes = 8 * 60; // 8 hours workday
    return Math.round((totalDuration / maxMinutes) * 100);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Tourenplanung
              </h1>
              <p className="text-lg text-gray-500">
                {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="rounded-xl bg-white/80 backdrop-blur-sm border border-white/40
                      hover:bg-blue-50 hover:border-blue-200
                      shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                      hover:-translate-y-0.5 hover:scale-105
                      transition-all duration-500 group"
                  >
                    <Calendar className="mr-2 h-4 w-4 transition-transform duration-500
                      group-hover:scale-110 group-hover:rotate-12" />
                    {format(selectedDate, "dd. MMMM yyyy", { locale: de })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border border-white/40
                  bg-white/80 backdrop-blur-sm shadow-xl">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => setShowNewTourDialog(true)}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600
                  text-white shadow-lg shadow-blue-500/25
                  hover:shadow-blue-500/40 hover:-translate-y-0.5 hover:scale-105
                  transition-all duration-500 group"
              >
                <Plus className="mr-2 h-4 w-4 transition-transform duration-500
                  group-hover:scale-110 group-hover:rotate-12" />
                Neue Tour
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-[300px,1fr,300px] gap-6">
            {/* Left Sidebar - Staff Selection */}
            <Card className="rounded-2xl border border-white/40 bg-white/80
              backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
              hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
              transition-all duration-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                  bg-clip-text text-transparent">
                  Mitarbeiter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Mitarbeiter suchen..."
                    className="rounded-xl border-white/40 bg-white/80
                      focus:border-blue-200 focus:ring-blue-200"
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-3 pr-4">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className={cn(
                          "p-4 rounded-xl transition-all duration-300 cursor-pointer",
                          "border border-white/40 hover:border-blue-200",
                          "bg-gradient-to-r from-white to-blue-50/50",
                          "hover:from-blue-50 hover:to-blue-100/50",
                          "shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20",
                          "hover:-translate-y-0.5 hover:scale-[1.02]",
                          "group",
                          employee.id === selectedEmployee && "from-blue-50 to-blue-100/50 border-blue-200"
                        )}
                        onClick={() => setSelectedEmployee(employee.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                            text-white shadow-lg shadow-blue-500/25 
                            transition-transform duration-500 group-hover:scale-110">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{employee.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant={calculateWorkload(employee.id) > 80 ? "destructive" : "secondary"}
                                className="text-xs rounded-lg font-medium px-2 py-0.5"
                              >
                                {calculateWorkload(employee.id)}% Auslastung
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Qualifications */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {employee.qualifications.nursingDegree && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Examiniert
                            </Badge>
                          )}
                          {Object.entries(employee.qualifications)
                            .filter(([key, value]) => value === true && key !== 'nursingDegree')
                            .map(([key]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {formatQualification(key)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Center - Tours Overview */}
            <div className="space-y-6">
              <Card className="rounded-2xl border border-white/40 bg-white/80
                backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
                transition-all duration-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                    bg-clip-text text-transparent">
                    Tagesübersicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dateFilteredTours
                      .filter(tour => !selectedEmployee || tour.employeeId === selectedEmployee)
                      .map((tour) => (
                        <div
                          key={tour.id}
                          className="p-4 rounded-xl bg-gradient-to-r from-white to-blue-50/50
                            border border-white/40 hover:border-blue-200
                            shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                            hover:-translate-y-1 hover:scale-[1.02]
                            transition-all duration-500 group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-500
                                transition-all duration-500 group-hover:scale-110 group-hover:rotate-12">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">
                                  {format(parseISO(tour.date.toString()), "HH:mm")}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {tour.optimizedRoute?.estimatedDuration} min
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="font-medium">
                              {tour.patientIds.length} Patienten
                            </Badge>
                          </div>

                          {/* Tour Stops */}
                          <div className="space-y-2 mt-4">
                            {tour.optimizedRoute?.waypoints.map((waypoint, index) => {
                              const patient = patients.find(p => p.id === waypoint.patientId);
                              if (!patient) return null;

                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-2 rounded-lg
                                    hover:bg-blue-50/50 transition-all duration-300"
                                >
                                  <div className="w-6 h-6 rounded-lg bg-blue-100 
                                    flex items-center justify-center text-blue-600 
                                    text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {patient.name}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      <MapPin className="h-3 w-3" />
                                      {patient.address}
                                    </div>
                                  </div>
                                  <Badge 
                                    variant={patient.careLevel >= 4 ? "destructive" : "secondary"}
                                    className="text-xs"
                                  >
                                    PG {patient.careLevel}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                    {dateFilteredTours.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Keine Touren für diesen Tag geplant</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card className="rounded-2xl border border-white/40 bg-white/80
                backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
                transition-all duration-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                      bg-clip-text text-transparent">
                      KI-Empfehlungen
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>Basierend auf der aktuellen Planung empfehlen wir:</p>
                    <ul className="list-disc pl-4 space-y-2">
                      <li>Tour #2 sollte aufgrund der Pflegestufen neu priorisiert werden</li>
                      <li>Mitarbeiter mit Wundversorgungsqualifikation für Patient Schmidt einplanen</li>
                      <li>Routenoptimierung könnte 45 Minuten Fahrzeit einsparen</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Patient Selection */}
            <Card className="rounded-2xl border border-white/40 bg-white/80
              backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
              hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)]
              transition-all duration-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600
                  bg-clip-text text-transparent">
                  Patienten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Patienten suchen..."
                    className="rounded-xl border-white/40 bg-white/80
                      focus:border-blue-200 focus:ring-blue-200"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-3 pr-4">
                    {patients
                      .filter(patient => patient.name.toLowerCase().includes(filters.search.toLowerCase()))
                      .map((patient) => (
                        <div
                          key={patient.id}
                          className="p-4 rounded-xl bg-gradient-to-r from-white to-blue-50/50
                            border border-white/40 hover:border-blue-200
                            shadow-lg shadow-blue-500/5 hover:shadow-blue-500/20
                            hover:-translate-y-0.5 hover:scale-[1.02]
                            transition-all duration-500 group
                            cursor-pointer"
                          onClick={() => {
                            // Handle patient selection
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                              text-white shadow-lg shadow-blue-500/25 
                              transition-transform duration-500 group-hover:scale-110">
                              <UsersIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{patient.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={patient.careLevel >= 4 ? "destructive" : "secondary"}
                                  className="text-xs rounded-lg font-medium px-2 py-0.5"
                                >
                                  Pflegegrad {patient.careLevel}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {patient.address}
                          </div>

                          {patient.notes && (
                            <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100
                              flex items-center gap-2 text-sm text-amber-700">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              {patient.notes}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function formatQualification(key: string): string {
  const mapping: Record<string, string> = {
    medicationAdministration: "Medikamentengabe",
    woundCare: "Wundversorgung",
    dementiaCare: "Demenzbetreuung",
    palliativeCare: "Palliativpflege",
    lifting: "Hebetechniken",
    firstAid: "Erste Hilfe"
  };
  return mapping[key] || key;
}