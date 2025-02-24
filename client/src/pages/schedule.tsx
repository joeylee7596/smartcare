import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Star,
  Users,
} from "lucide-react";
import type { Employee, Shift } from "@shared/schema";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [department, setDepartment] = useState("all");

  // Get the start of the week for the selected date
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch employees and shifts
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
      department,
    }],
  });

  // Helper function to get shifts for an employee on a specific day
  const getEmployeeShifts = (employeeId: number, date: Date) => {
    return shifts.filter(shift => 
      shift.employeeId === employeeId && 
      format(new Date(shift.startTime), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  // Helper function to render shift badges
  const renderShiftBadge = (shift: Shift) => {
    const startHour = new Date(shift.startTime).getHours();
    let color = "text-yellow-500";
    let label = "Früh";

    if (startHour >= 14) {
      color = "text-orange-500";
      label = "Spät";
    } else if (startHour >= 22 || startHour < 6) {
      color = "text-blue-500";
      label = "Nacht";
    }

    return (
      <Badge 
        key={shift.id} 
        variant="secondary"
        className="flex items-center gap-1"
      >
        <Clock className={`h-3 w-3 ${color}`} />
        <span>{label}</span>
        <span className="ml-1">
          {format(new Date(shift.startTime), 'HH:mm')}
        </span>
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Top Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Dienstplan
              </h1>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() - 7);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-medium">
                  {format(weekStart, "dd.MM.yyyy", { locale: de })} - {format(addDays(weekStart, 6), "dd.MM.yyyy", { locale: de })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(selectedDate.getDate() + 7);
                    setSelectedDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Alle Abteilungen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  <SelectItem value="general">Allgemeinpflege</SelectItem>
                  <SelectItem value="intensive">Intensivpflege</SelectItem>
                  <SelectItem value="palliative">Palliativpflege</SelectItem>
                </SelectContent>
              </Select>

              <Button>
                <Brain className="h-4 w-4 mr-2" />
                KI-Optimierung
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Wochenübersicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="min-w-[1000px]">
                  {/* Header row with dates */}
                  <div className="grid grid-cols-[250px_repeat(7,1fr)] gap-2 mb-4 text-sm font-medium">
                    <div className="px-4 py-2">Mitarbeiter</div>
                    {weekDays.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`px-4 py-2 text-center rounded-md ${
                          format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            ? 'bg-blue-50'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div>{format(day, "EEEE", { locale: de })}</div>
                        <div className="text-muted-foreground">
                          {format(day, "dd.MM.")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Employee rows */}
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="grid grid-cols-[250px_repeat(7,1fr)] gap-2"
                      >
                        {/* Employee info */}
                        <div className="px-4 py-2 flex items-center gap-2">
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="flex items-center gap-1 mt-1">
                              {employee.role === 'nurse' && (
                                <Badge variant="secondary" className="h-5">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Examiniert
                                </Badge>
                              )}
                              {employee.qualifications?.woundCare && (
                                <Badge variant="outline" className="h-5">
                                  <Star className="h-3 w-3 mr-1" />
                                  Wundexperte
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Shift cells for each day */}
                        {weekDays.map((day) => {
                          const dayShifts = getEmployeeShifts(employee.id, day);
                          return (
                            <div
                              key={day.toISOString()}
                              className={`px-4 py-2 rounded-md border ${
                                dayShifts.length > 0 ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex flex-wrap gap-1">
                                {dayShifts.map(renderShiftBadge)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}