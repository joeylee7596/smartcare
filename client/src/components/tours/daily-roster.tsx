import { Employee, Tour } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Brain, Clock, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface DailyRosterProps {
  employees: Employee[];
  tours: Tour[];
  selectedDate: Date;
}

export function DailyRoster({ employees, tours, selectedDate }: DailyRosterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tagesdienstplan</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {employees.map((employee) => {
              const employeeTours = tours.filter(
                (tour) =>
                  tour.employeeId === employee.id &&
                  isSameDay(parseISO(tour.date.toString()), selectedDate)
              ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              const totalPatients = employeeTours.reduce(
                (sum, tour) => sum + tour.patientIds.length,
                0
              );

              const isOverworked = totalPatients > employee.maxPatientsPerDay;

              // Get working hours for the current day
              const dayOfWeek = format(selectedDate, "EEEE", { locale: de }).toLowerCase();
              const workingHours = employee.workingHours[dayOfWeek];

              return (
                <Card key={employee.id} className="p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{employee.name}</h3>
                        {employee.qualifications.nursingDegree && (
                          <Badge variant="secondary" className="h-5">
                            <Shield className="h-3 w-3 mr-1" />
                            Examiniert
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {workingHours?.isWorkingDay
                          ? `${workingHours.start} - ${workingHours.end}`
                          : "Nicht im Dienst"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOverworked ? (
                        <Badge variant="destructive" className="h-6">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Überlastet
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-6">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {totalPatients}/{employee.maxPatientsPerDay} Patienten
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {employeeTours.map((tour) => (
                      <div
                        key={tour.id}
                        className={clsx(
                          "p-2 rounded-lg",
                          "border border-gray-200",
                          "flex items-center justify-between",
                          "bg-white hover:bg-gray-50 transition-colors"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                            <Clock className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {format(parseISO(tour.date.toString()), "HH:mm")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tour.patientIds.length} Patienten
                            </p>
                          </div>
                        </div>
                        {tour.optimizationScore && (
                          <div className="flex items-center gap-1">
                            <Brain className="h-4 w-4 text-purple-500" />
                            <span className="text-sm">{tour.optimizationScore}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {employeeTours.length === 0 && workingHours?.isWorkingDay && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Keine Touren geplant
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
