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
import { Separator } from "@/components/ui/separator";
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
  ChevronRight
} from "lucide-react";

const WORKING_HOURS = {
  start: 6,
  end: 22
};

const TimelineHour = ({ hour }: { hour: number }) => (
  <div className="relative w-20 flex-shrink-0 text-center">
    <span className="text-sm text-gray-500">
      {String(hour).padStart(2, '0')}:00
    </span>
  </div>
);

const TimelineEvent = ({ 
  tour, 
  patients 
}: { 
  tour: Tour;
  patients: Patient[];
}) => {
  const startTime = parseISO(tour.date.toString());
  const endTime = addHours(startTime, tour.optimizedRoute?.estimatedDuration || 1);

  const startHour = startTime.getHours() + (startTime.getMinutes() / 60);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const left = `${((startHour - WORKING_HOURS.start) / (WORKING_HOURS.end - WORKING_HOURS.start)) * 100}%`;
  const width = `${(duration / (WORKING_HOURS.end - WORKING_HOURS.start)) * 100}%`;

  return (
    <div
      className={cn(
        "absolute top-0 h-full rounded-xl p-2 cursor-pointer",
        "transition-all duration-300 group",
        "hover:shadow-lg hover:-translate-y-0.5 hover:z-10",
        tour.status === "active" ? "bg-green-100 border border-green-200" :
        tour.status === "completed" ? "bg-blue-100 border border-blue-200" :
        "bg-amber-100 border border-amber-200"
      )}
      style={{ left, width }}
    >
      <div className="flex items-center h-full">
        <div className="space-y-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">
              {format(startTime, "HH:mm")}
            </span>
          </div>
          <div className="text-xs font-medium truncate">
            {tour.patientIds.map(id => 
              patients.find(p => p.id === id)?.name
            ).join(", ")}
          </div>
        </div>
      </div>
    </div>
  );
};

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

  const timelineHours = Array.from(
    { length: WORKING_HOURS.end - WORKING_HOURS.start },
    (_, i) => WORKING_HOURS.start + i
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
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
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

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Tagesübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline Header */}
                  <div className="flex border-b pb-2 mb-4">
                    <div className="w-48 flex-shrink-0">Mitarbeiter</div>
                    <div className="flex-1 flex">
                      {timelineHours.map(hour => (
                        <TimelineHour key={hour} hour={hour} />
                      ))}
                    </div>
                  </div>

                  {/* Timeline Content */}
                  <div className="space-y-6">
                    {employees.map(employee => (
                      <div key={employee.id} className="relative">
                        <div className="flex items-center mb-4">
                          <div className="w-48 flex-shrink-0">
                            <p className="font-medium">{employee.name}</p>
                          </div>
                          <div className="flex-1 relative h-16 bg-gray-50 rounded-xl">
                            {/* Hour markers */}
                            <div className="absolute inset-0 flex">
                              {timelineHours.map(hour => (
                                <div 
                                  key={hour} 
                                  className="flex-1 border-l border-gray-200 first:border-l-0"
                                />
                              ))}
                            </div>

                            {/* Events */}
                            {dateFilteredTours
                              .filter(tour => tour.employeeId === employee.id)
                              .map(tour => (
                                <TimelineEvent
                                  key={tour.id}
                                  tour={tour}
                                  patients={patients}
                                />
                              ))
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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