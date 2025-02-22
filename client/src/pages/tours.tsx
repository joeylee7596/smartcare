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
  MapIcon
} from "lucide-react";
import { TourMap } from "@/components/tours/tour-map";
import AddTourDialog from "@/components/tours/add-tour-dialog";


const WORKING_HOURS = {
  start: 6,
  end: 22
};

const EMPLOYEE_COLORS = [
  { light: "bg-blue-100 hover:bg-blue-200", border: "border-blue-200", text: "text-blue-700" },
  { light: "bg-purple-100 hover:bg-purple-200", border: "border-purple-200", text: "text-purple-700" },
  { light: "bg-green-100 hover:bg-green-200", border: "border-green-200", text: "text-green-700" },
  { light: "bg-amber-100 hover:bg-amber-200", border: "border-amber-200", text: "text-amber-700" },
  { light: "bg-red-100 hover:bg-red-200", border: "border-red-200", text: "text-red-700" },
  { light: "bg-indigo-100 hover:bg-indigo-200", border: "border-indigo-200", text: "text-indigo-700" },
];

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

interface TimelineEventProps {
  tour: Tour;
  patients: Patient[];
  employeeColor: typeof EMPLOYEE_COLORS[0];
}

function TimelineEvent({ tour, patients, employeeColor }: TimelineEventProps) {
  const hourWidth = 60;
  const baseDate = parseISO(tour.date.toString());

  const visits = tour.patientIds.map((patientId, index) => {
    const patient = patients.find(p => p.id === patientId);
    const visitStart = addMinutes(baseDate, index * 45);
    const visitDuration = 30;

    return {
      patient,
      start: visitStart,
      end: addMinutes(visitStart, visitDuration)
    };
  });

  return (
    <>
      {visits.map((visit, index) => {
        if (index === visits.length - 1) return null;

        const startX = ((visit.end.getHours() + visit.end.getMinutes() / 60) - WORKING_HOURS.start) * hourWidth;
        const nextVisit = visits[index + 1];
        const endX = ((nextVisit.start.getHours() + nextVisit.start.getMinutes() / 60) - WORKING_HOURS.start) * hourWidth;

        return (
          <div
            key={`connection-${index}`}
            className="absolute h-0 border-t-2 border-dashed border-gray-300"
            style={{
              left: `${startX}px`,
              top: '50%',
              width: `${endX - startX}px`,
              transform: 'translateY(-50%)',
              zIndex: 0
            }}
          />
        );
      })}

      {visits.map((visit, index) => {
        const startHour = visit.start.getHours() + (visit.start.getMinutes() / 60);
        const duration = (visit.end.getTime() - visit.start.getTime()) / (1000 * 60 * 60);

        const left = (startHour - WORKING_HOURS.start) * hourWidth;
        const width = duration * hourWidth;

        return (
          <div
            key={`visit-${index}`}
            className={cn(
              "absolute h-[calc(100%-6px)] m-1 rounded-lg p-1.5",
              "transition-all duration-300 group cursor-pointer",
              "hover:shadow-lg hover:-translate-y-0.5 hover:z-10",
              employeeColor.light,
              employeeColor.border
            )}
            style={{
              left: `${left}px`,
              width: `${width}px`,
              zIndex: 1
            }}
          >
            <div className="h-full flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-1">
                <Clock className={cn("h-3 w-3", employeeColor.text)} />
                <span className="text-xs font-medium text-gray-900">
                  {format(visit.start, "HH:mm")}
                </span>
              </div>
              <div className={cn("text-xs font-medium truncate", employeeColor.text)}>
                {visit.patient?.name}
              </div>
            </div>
          </div>
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
  const employeeTours = tours.filter(tour => tour.employeeId === employee.id);
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

          {employeeTours.map(tour => (
            <TimelineEvent
              key={tour.id}
              tour={tour}
              patients={patients}
              employeeColor={employeeColor}
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

  const dateFilteredTours = tours.filter(tour =>
    isSameDay(parseISO(tour.date.toString()), selectedDate)
  );

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
                        onClick={() => setSelectedEmployee(
                          selectedEmployee === employee.id ? null : employee.id
                        )}
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
                          .filter(employee => !selectedEmployee || employee.id === selectedEmployee)
                          .map(employee => (
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
                      patientIds={dateFilteredTours.flatMap(t => t.patientIds)}
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
    firstAid: "Erste Hilfe"
  };
  return mapping[key] || key;
}