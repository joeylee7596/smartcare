import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Tour, Patient, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Users as UsersIcon,
  Clock,
  Calendar,
  Search,
  Plus,
  Brain,
  Shield,
  ChevronLeft,
  ChevronRight,
  MapIcon,
  Activity,
  Heart,
  AlertTriangle,
  Euro,
  PhoneCall,
  WifiOff,
  Navigation,
  PenTool,
  ListIcon,
  Calendar as CalendarIcon,
  Map
} from "lucide-react";
import { TourMap } from "@/components/tours/tour-map";
import AddTourDialog from "@/components/tours/add-tour-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmployeeTourDetails } from "@/components/tours/employee-tour-details";

export default function Tours() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [showAddTourDialog, setShowAddTourDialog] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'map'>('list');

  // Get patientId from URL if provided
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const patientId = searchParams.get('patient');
    if (patientId) {
      const patientIdNum = parseInt(patientId);
      const tour = tours.find(t => t.patientIds.includes(patientIdNum));
      if (tour) {
        setSelectedDate(parseISO(tour.date.toString()));
        setSelectedEmployee(tour.employeeId);
        setSelectedEmployeeForDetails(employees.find(e => e.id === tour.employeeId) || null);
        setShowEmployeeDetails(true);
      }
    }
  }, []);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const dateFilteredTours = tours.filter((tour) => isSameDay(parseISO(tour.date.toString()), selectedDate));

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployeeForDetails(employee);
    setShowEmployeeDetails(true);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Top Navigation Bar */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Tourenplanung
              </h1>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:bg-blue-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:bg-blue-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex rounded-lg border bg-card p-1">
                <Button
                  variant={activeView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('list')}
                >
                  <ListIcon className="h-4 w-4 mr-1" />
                  Liste
                </Button>
                <Button
                  variant={activeView === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('calendar')}
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Kalender
                </Button>
                <Button
                  variant={activeView === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('map')}
                >
                  <Map className="h-4 w-4 mr-1" />
                  Karte
                </Button>
              </div>

              <Button
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                size="default"
                onClick={() => setShowAddTourDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Neue Tour
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-[280px,1fr] gap-6">
            {/* Left Sidebar - Employee List */}
            <Card>
              <CardHeader>
                <CardTitle>Mitarbeiter</CardTitle>
                <div className="mt-2">
                  <Input placeholder="Suchen..." className="w-full" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-4 py-2 space-y-2">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        onClick={() => {
                          setSelectedEmployee(selectedEmployee === employee.id ? null : employee.id);
                          handleEmployeeClick(employee);
                        }}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer",
                          "transition-all duration-200",
                          "hover:bg-blue-50",
                          selectedEmployee === employee.id && "bg-blue-50 border-blue-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{employee.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>
                                {dateFilteredTours.filter((t) => t.employeeId === employee.id).length}{" "}
                                Touren
                              </span>
                            </div>
                          </div>
                          {employee.qualifications.nursingDegree && (
                            <Badge variant="secondary" className="h-6">
                              <Shield className="h-3 w-3 mr-1" />
                              Examiniert
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="space-y-6">
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0">
                  <Tabs value={activeView} className="w-full">
                    <TabsContent value="list" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle>Tagesübersicht</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-[calc(100vh-400px)]">
                            <div className="space-y-4">
                              {dateFilteredTours
                                .filter((tour) => !selectedEmployee || tour.employeeId === selectedEmployee)
                                .map((tour) => {
                                  const employee = employees.find((e) => e.id === tour.employeeId);
                                  const tourPatients = tour.patientIds.map(
                                    (id) => patients.find((p) => p.id === id)!
                                  );

                                  return (
                                    <Card key={tour.id} className="p-4 hover:shadow-lg transition-shadow">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h3 className="font-medium text-lg">{employee?.name}</h3>
                                          <p className="text-sm text-gray-500">
                                            {format(parseISO(tour.date.toString()), "HH:mm")}
                                          </p>
                                        </div>
                                        <Badge variant={tour.economicIndicator as "default" | "destructive" | "outline"}>
                                          <Euro className="h-3.5 w-3.5 mr-1" />
                                          {tour.economicCalculation?.profitMargin.toFixed(1)}%
                                        </Badge>
                                      </div>
                                      <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Patienten:</h4>
                                        <div className="space-y-2">
                                          {tourPatients.map((patient) => (
                                            <div key={patient.id} className="flex items-center gap-2">
                                              <Heart className="h-4 w-4 text-blue-500" />
                                              <span>{patient.name}</span>
                                              <Badge variant="outline" className="ml-2">
                                                PG {patient.careLevel}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </Card>
                                  );
                                })}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="calendar" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle>Kalenderansicht</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Calendar view implementation */}
                          <div className="h-[calc(100vh-400px)] flex items-center justify-center text-gray-500">
                            Kalenderansicht wird geladen...
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="map" className="mt-0">
                      <Card>
                        <CardHeader>
                          <CardTitle>Kartenansicht</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[calc(100vh-400px)] rounded-xl overflow-hidden border border-gray-200 relative">
                            <TourMap
                              patientIds={dateFilteredTours.flatMap((t) => t.patientIds)}
                              selectedEmployeeId={selectedEmployee}
                              className="w-full h-full"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card className="rounded-2xl border border-white/40 bg-white/80 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_60px_-15px_rgba(59,130,246,0.2)] transition-all duration-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
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
          </div>

          {showAddTourDialog && (
            <AddTourDialog
              open={showAddTourDialog}
              onOpenChange={setShowAddTourDialog}
              selectedDate={selectedDate}
              selectedEmployeeId={selectedEmployee}
            />
          )}

          {showEmployeeDetails && selectedEmployeeForDetails && (
            <EmployeeTourDetails
              open={showEmployeeDetails}
              onOpenChange={setShowEmployeeDetails}
              employee={selectedEmployeeForDetails}
              initialDate={selectedDate}
            />
          )}
        </main>
      </div>
    </div>
  );
}