import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay, endOfDay, addHours, isSameDay } from "date-fns";
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
  MapIcon
} from "lucide-react";

const WORKING_HOURS = {
  start: 6,
  end: 22
};

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function TimelineHeader() {
  const hours = Array.from(
    { length: WORKING_HOURS.end - WORKING_HOURS.start },
    (_, i) => WORKING_HOURS.start + i
  );

  return (
    <div className="flex border-b border-gray-200 pb-2 sticky top-0 bg-white z-10">
      <div className="w-64 flex-shrink-0 px-4 font-medium text-gray-500">
        Mitarbeiter
      </div>
      <div className="flex" style={{ width: `${hours.length * 120}px` }}>
        {hours.map((hour) => (
          <div key={hour} className="w-[120px] text-center">
            <span className="text-sm text-gray-500">{formatHour(hour)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineEventProps {
  tour: Tour;
  patients: Patient[];
}

function TimelineEvent({ tour, patients }: TimelineEventProps) {
  const startTime = parseISO(tour.date.toString());
  const endTime = addHours(startTime, tour.optimizedRoute?.estimatedDuration || 1);

  const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const totalHours = WORKING_HOURS.end - WORKING_HOURS.start;
  const hourWidth = 120; // Fixe Breite pro Stunde in Pixeln
  const left = (startHour - WORKING_HOURS.start) * hourWidth;
  const width = duration * hourWidth;

  return (
    <div
      className={cn(
        "absolute h-[calc(100%-8px)] m-1 rounded-lg p-2",
        "transition-all duration-300 group cursor-pointer",
        "hover:shadow-lg hover:-translate-y-0.5 hover:z-10",
        {
          "bg-green-100 border border-green-200 hover:bg-green-200": tour.status === "active",
          "bg-blue-100 border border-blue-200 hover:bg-blue-200": tour.status === "completed",
          "bg-amber-100 border border-amber-200 hover:bg-amber-200": tour.status === "scheduled"
        }
      )}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    >
      <div className="h-full flex flex-col justify-center overflow-hidden">
        <div className="flex items-center gap-2 mb-0.5">
          <Clock className="h-3 w-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">
            {format(startTime, "HH:mm")}
          </span>
        </div>
        <div className="text-xs font-medium text-gray-700 truncate">
          {tour.patientIds.map(id => 
            patients.find(p => p.id === id)?.name
          ).join(", ")}
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ employee, tours, patients }: { 
  employee: Employee;
  tours: Tour[];
  patients: Patient[];
}) {
  const employeeTours = tours.filter(tour => tour.employeeId === employee.id);
  const hours = WORKING_HOURS.end - WORKING_HOURS.start;

  return (
    <div className="group">
      <div className="flex items-center min-h-[100px] relative border-b border-gray-100 last:border-b-0">
        <div className="w-64 flex-shrink-0 px-4">
          <div className="font-medium text-gray-700">{employee.name}</div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{employeeTours.length} Touren</span>
          </div>
          {employee.qualifications.nursingDegree && (
            <Badge variant="secondary" className="mt-2">
              <Shield className="h-3 w-3 mr-1" />
              Examiniert
            </Badge>
          )}
        </div>
        <div className="relative" style={{ width: `${hours * 120}px` }}>
          {/* Hour markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: hours }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-[120px] border-l border-gray-100",
                  "group-hover:border-gray-200 transition-colors duration-200",
                  i === 0 && "border-l-0"
                )}
              />
            ))}
          </div>

          {/* Background */}
          <div className="absolute inset-0 bg-gray-50/50 rounded-xl" />

          {/* Events */}
          {employeeTours.map(tour => (
            <TimelineEvent
              key={tour.id}
              tour={tour}
              patients={patients}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Tours() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const dateFilteredTours = tours.filter(tour => 
    isSameDay(parseISO(tour.date.toString()), selectedDate)
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Header */}
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
            >
              <Plus className="mr-2 h-4 w-4" />
              Neue Tour
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-[280px,1fr] gap-6">
            {/* Left Sidebar - Staff */}
            <Card>
              <CardHeader>
                <CardTitle>Mitarbeiter</CardTitle>
                <div className="mt-2">
                  <Input
                    placeholder="Suchen..."
                    className="w-full"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-4 py-2 space-y-2">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee.id)}
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
                                {dateFilteredTours.filter(t => t.employeeId === employee.id).length} Touren
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

            {/* Right Content Area */}
            <div className="space-y-6">
              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Tagesübersicht</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-400px)]" orientation="horizontal">
                    <div className="relative min-w-[1200px]">
                      <TimelineHeader />
                      {/* Timeline Rows */}
                      <div className="mt-4">
                        {employees.map(employee => (
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

              {/* Map Card */}
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
                  <div className="h-[300px] rounded-xl bg-gray-100 flex items-center justify-center">
                    <MapIcon className="h-12 w-12 text-gray-400" />
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