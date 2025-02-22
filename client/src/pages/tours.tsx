import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay, endOfDay, addHours, isSameDay, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  PenTool
} from "lucide-react";
import { TourMap } from "@/components/tours/tour-map";
import AddTourDialog from "@/components/tours/add-tour-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WORKING_HOURS = {
  start: 6,
  end: 22,
};

const EMPLOYEE_COLORS = [
  { light: "bg-gradient-to-br from-blue-100 to-blue-200", border: "border-blue-200", text: "text-blue-700" },
  { light: "bg-gradient-to-br from-purple-100 to-purple-200", border: "border-purple-200", text: "text-purple-700" },
  { light: "bg-gradient-to-br from-green-100 to-green-200", border: "border-green-200", text: "text-green-700" },
  { light: "bg-gradient-to-br from-amber-100 to-amber-200", border: "border-amber-200", text: "text-amber-700" },
  { light: "bg-gradient-to-br from-red-100 to-red-200", border: "border-red-200", text: "text-red-700" },
  { light: "bg-gradient-to-br from-indigo-100 to-indigo-200", border: "border-indigo-200", text: "text-indigo-700" },
];

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function TimelineHeader() {
  const hours = Array.from(
    { length: WORKING_HOURS.end - WORKING_HOURS.start },
    (_, i) => WORKING_HOURS.start + i
  );

  return (
    <div className="flex border-b border-gray-200 pb-2 sticky top-0 bg-white z-10">
      <div className="w-40 flex-shrink-0 px-4 font-medium text-gray-500">
        Mitarbeiter
      </div>
      <div className="flex" style={{ width: `${hours.length * 60}px` }}>
        {hours.map((hour) => (
          <div key={hour} className="w-[60px] text-center">
            <span className="text-sm text-gray-500">{formatHour(hour)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEmployeeColor(employeeId: number) {
  return EMPLOYEE_COLORS[employeeId % EMPLOYEE_COLORS.length];
}

interface Visit {
  patient: Patient;
  start: Date;
  duration: number;
  end: Date;
}

interface TimelineEventProps {
  tour: Tour;
  patients: Patient[];
  employeeColor: typeof EMPLOYEE_COLORS[0];
}

function getRandomDuration(careLevel: number): number {
  const baseDuration = 20 + careLevel * 5;
  const variation = baseDuration * 0.15;
  return Math.round(baseDuration + Math.random() * variation * 2 - variation);
}

function calculateTravelTime(from: string, to: string): number {
  const [fromLat, fromLng] = from.split(",").map(parseFloat);
  const [toLat, toLng] = to.split(",").map(parseFloat);

  if (!fromLat || !fromLng || !toLat || !toLng) return 15;

  const dx = Math.abs(fromLat - toLat);
  const dy = Math.abs(fromLng - toLng);
  const distance = Math.sqrt(dx * dx + dy * dy) * 111;

  const baseTime = Math.round(distance * 2);
  const trafficVariation = Math.round(baseTime * 0.3 * (Math.random() - 0.5));

  return Math.max(5, Math.min(60, baseTime + trafficVariation));
}

function TimelineEvent({ tour, patients, employeeColor }: TimelineEventProps) {
  const hourWidth = 60;
  const baseDate = parseISO(tour.date.toString());

  // Calculate visits and their timings
  let currentTime = baseDate;
  const visits: Visit[] = [];

  for (let i = 0; i < tour.patientIds.length; i++) {
    const patientId = tour.patientIds[i];
    const patient = patients.find((p) => p.id === patientId);

    if (!patient) continue;

    // Add travel time from previous location if not first visit
    if (i > 0) {
      const prevPatient = patients.find((p) => p.id === tour.patientIds[i - 1]);
      if (prevPatient) {
        const travelTime = calculateTravelTime(prevPatient.address, patient.address);
        currentTime = addMinutes(currentTime, travelTime);
      }
    }

    const visitDuration = getRandomDuration(patient.careLevel);
    const visit: Visit = {
      patient,
      start: currentTime,
      duration: visitDuration,
      end: addMinutes(currentTime, visitDuration),
    };

    visits.push(visit);
    currentTime = visit.end;
  }

  return (
    <>
      {visits.map((visit, index) => {
        if (index === visits.length - 1) return null;

        const startX = ((visit.end.getHours() + visit.end.getMinutes() / 60) - WORKING_HOURS.start) * hourWidth;
        const nextVisit = visits[index + 1];
        const endX = ((nextVisit.start.getHours() + nextVisit.start.getMinutes() / 60) - WORKING_HOURS.start) * hourWidth;
        const travelTime = calculateTravelTime(visit.patient.address, nextVisit.patient.address);

        return (
          <div
            key={`connection-${index}`}
            className="absolute group"
            style={{
              left: `${startX}px`,
              top: "50%",
              width: `${endX - startX}px`,
              transform: "translateY(-50%)",
              zIndex: 0,
            }}
          >
            {/* Travel time indicator */}
            <div className="h-0.5 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full 
              opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-6
              bg-white rounded-xl shadow-lg p-2 text-xs flex items-center gap-2"
            >
              <MapPin className="h-3 w-3 text-gray-500" />
              <span className="font-medium text-gray-700">{travelTime} Min. Fahrzeit</span>
            </div>
          </div>
        );
      })}

      {visits.map((visit, index) => {
        const startHour = visit.start.getHours() + visit.start.getMinutes() / 60;
        const duration = visit.duration / 60;

        const left = (startHour - WORKING_HOURS.start) * hourWidth;
        const width = duration * hourWidth;

        return (
          <TooltipProvider key={`visit-${index}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute h-[calc(100%-8px)] m-1 rounded-2xl p-2",
                    "transition-all duration-500 group cursor-pointer",
                    "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 hover:z-10",
                    employeeColor.light,
                    "border border-white/40 backdrop-blur-sm",
                    "hover:scale-[1.02]"
                  )}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    zIndex: 1,
                  }}
                >
                  <div className="h-full flex flex-col justify-center overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <Clock className={cn("h-3.5 w-3.5", employeeColor.text)} />
                      <span className="text-sm font-medium text-gray-900">
                        {format(visit.start, "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Heart className={cn("h-3.5 w-3.5", employeeColor.text)} />
                      <span className={cn("text-sm font-medium truncate", employeeColor.text)}>
                        {visit.patient.name}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className={cn("h-5 w-5", employeeColor.text)} />
                      <span className="text-lg font-medium">{visit.patient.name}</span>
                    </div>
                    <Badge variant={tour.economicIndicator as "default" | "destructive" | "outline"}>
                      <Euro className="h-3.5 w-3.5 mr-1" />
                      {tour.economicCalculation?.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Activity className="h-4 w-4" />
                      <span>Pflegegrad:</span>
                    </div>
                    <div className="font-medium">{visit.patient.careLevel}</div>

                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Besuchsdauer:</span>
                    </div>
                    <div className="font-medium">{visit.duration} Min.</div>

                    <div className="flex items-center gap-2 text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>Adresse:</span>
                    </div>
                    <div className="font-medium">{visit.patient.address}</div>

                    {visit.patient.notes && (
                      <>
                        <div className="flex items-center gap-2 text-gray-500">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Notizen:</span>
                        </div>
                        <div className="font-medium text-amber-600">{visit.patient.notes}</div>
                      </>
                    )}

                    {/* Add new mobile documentation status */}
                    <div className="flex items-center gap-2 text-gray-500">
                      <PhoneCall className="h-4 w-4" />
                      <span>Mobile Doku:</span>
                    </div>
                    <div className="flex gap-2">
                      {tour.mobileDocumentation?.offlineCapable && (
                        <Badge variant="outline" className="h-6">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                      {tour.mobileDocumentation?.gpsTracking && (
                        <Badge variant="outline" className="h-6">
                          <Navigation className="h-3 w-3 mr-1" />
                          GPS
                        </Badge>
                      )}
                      {tour.mobileDocumentation?.signatureRequired && (
                        <Badge variant="outline" className="h-6">
                          <PenTool className="h-3 w-3 mr-1" />
                          Unterschrift
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </>
  );
}

function TimelineRow({ employee, tours, patients }: {
  employee: Employee;
  tours: Tour[];
  patients: Patient[];
}) {
  const employeeTours = tours.filter((tour) => tour.employeeId === employee.id);
  const hours = WORKING_HOURS.end - WORKING_HOURS.start;
  const employeeColor = getEmployeeColor(employee.id);

  return (
    <div className="group">
      <div className="flex items-center min-h-[72px] relative border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors duration-200">
        <div className="w-40 flex-shrink-0 px-4">
          <div className={cn("font-medium", employeeColor.text)}>{employee.name}</div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{employeeTours.length} Touren</span>
          </div>
        </div>
        <div className="relative" style={{ width: `${hours * 60}px` }}>
          <div className="absolute inset-0 flex">
            {Array.from({ length: hours }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-[60px] border-l border-gray-100",
                  "group-hover:border-gray-200 transition-colors duration-200",
                  i === 0 && "border-l-0"
                )}
              />
            ))}
          </div>

          <div className="absolute inset-0 bg-gray-50/50 rounded-xl" />

          {employeeTours.map((tour) => (
            <TimelineEvent key={tour.id} tour={tour} patients={patients} employeeColor={employeeColor} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Tours() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [showAddTourDialog, setShowAddTourDialog] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
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

            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
              size="lg"
              onClick={() => setShowAddTourDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Neue Tour
            </Button>
          </div>

          <div className="grid grid-cols-[280px,1fr] gap-6">
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
                        onClick={() =>
                          setSelectedEmployee(selectedEmployee === employee.id ? null : employee.id)
                        }
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

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Tagesübersicht</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    <div className="relative min-w-[600px]">
                      <TimelineHeader />
                      <div className="mt-4">
                        {employees
                          .filter((employee) => !selectedEmployee || employee.id === selectedEmployee)
                          .map((employee) => (
                            <TimelineRow
                              key={employee.id}
                              employee={employee}
                              tours={dateFilteredTours}
                              patients={patients}
                            />
                          ))}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>Kartenansicht</CardTitle>
                    <Button variant="outline" size="sm">
                      <MapIcon className="h-4 w-4 mr-2" />
                      Vollbild
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] rounded-xl overflow-hidden border border-gray-200">
                    <TourMap
                      patientIds={dateFilteredTours.flatMap((t) => t.patientIds)}
                      selectedEmployeeId={selectedEmployee}
                      className="w-full h-full"
                    />
                  </div>
                </CardContent>
              </Card>

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
    firstAid: "Erste Hilfe",
  };
  return mapping[key] || key;
}