import { Employee, Shift } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import {
  Brain,
  Clock,
  Shield,
  AlertTriangle,
  Sun,
  Moon,
  Coffee,
  UserCheck,
  Calendar,
  Star
} from "lucide-react";
import { clsx } from "clsx";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

interface DailyRosterProps {
  employees: Employee[];
  shifts: Shift[];
  selectedDate: Date;
}

export function DailyRoster({ employees, shifts, selectedDate }: DailyRosterProps) {
  // Get the start of the week for the selected date
  const weekStart = startOfWeek(selectedDate, { locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Helper function to get shift type icon
  const getShiftIcon = (startHour: number) => {
    if (startHour >= 6 && startHour < 14) return <Sun className="h-4 w-4 text-yellow-500" />;
    if (startHour >= 14 && startHour < 22) return <Coffee className="h-4 w-4 text-orange-500" />;
    return <Moon className="h-4 w-4 text-blue-500" />;
  };

  return (
    <Card className="border-none shadow-none bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            Wochendienstplan
          </CardTitle>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schicht hinzufügen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="space-y-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="overflow-hidden border border-gray-100">
                <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{employee.name}</h3>
                        {employee.role === 'nurse' && (
                          <Badge variant="secondary" className="h-5">
                            <Shield className="h-3 w-3 mr-1" />
                            Examiniert
                          </Badge>
                        )}
                        {employee.qualifications?.woundCare && (
                          <Badge variant="outline" className="h-5 border-purple-200 bg-purple-50 text-purple-700">
                            <Star className="h-3 w-3 mr-1" />
                            Wundexperte
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <UserCheck className="h-4 w-4 mr-1" />
                          {employee.maxPatientsPerDay || 8} max. Patienten
                        </span>
                        <Badge variant="outline" className="h-5">
                          {employee.workingHours?.monday?.isWorkingDay ? "Vollzeit" : "Teilzeit"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, index) => {
                      const dayShifts = shifts.filter(
                        shift => shift.employeeId === employee.id && isSameDay(parseISO(shift.startTime.toString()), day)
                      ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                      const workingHours = employee.workingHours?.[format(day, 'EEEE', { locale: de }).toLowerCase()];
                      const isWorkingDay = workingHours?.isWorkingDay ?? false;

                      return (
                        <div
                          key={index}
                          className={clsx(
                            "p-2 rounded-lg min-h-[120px]",
                            "border transition-colors",
                            isSameDay(day, selectedDate)
                              ? "border-blue-200 bg-blue-50/50"
                              : "border-gray-100 hover:bg-gray-50/50",
                            !isWorkingDay && "bg-gray-50/30 opacity-50"
                          )}
                        >
                          <div className="text-xs font-medium text-gray-500 mb-2">
                            {format(day, "EEE, dd.MM", { locale: de })}
                          </div>
                          {isWorkingDay ? (
                            <div className="space-y-1">
                              {dayShifts.map((shift) => (
                                <HoverCard key={shift.id}>
                                  <HoverCardTrigger asChild>
                                    <div
                                      className={clsx(
                                        "p-2 rounded bg-white",
                                        "border border-gray-100",
                                        "cursor-pointer hover:shadow-sm transition-shadow",
                                        "flex items-center justify-between"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getShiftIcon(new Date(shift.startTime).getHours())}
                                        <span className="text-sm">
                                          {format(new Date(shift.startTime), "HH:mm")}
                                        </span>
                                      </div>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 p-0">
                                    <div className="p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium">Schicht Details</h4>
                                        <Badge variant="outline">
                                          {shift.type}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4" />
                                          <span>
                                            {format(new Date(shift.startTime), "HH:mm")} -
                                            {format(new Date(shift.endTime), "HH:mm")}
                                          </span>
                                        </div>
                                        {shift.notes && (
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                            <span>{shift.notes}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs text-gray-400">
                              Nicht im Dienst
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}