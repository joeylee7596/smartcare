import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Coffee, PalmtreeIcon, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Employee, Shift } from "@shared/schema";

const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Früh" },
  late: { icon: Coffee, color: "text-orange-500", bgColor: "bg-orange-50", label: "Spät" },
  night: { icon: Moon, color: "text-blue-500", bgColor: "bg-blue-50", label: "Nacht" },
  vacation: { icon: PalmtreeIcon, color: "text-green-500", bgColor: "bg-green-50", label: "Urlaub" },
  sick: { icon: Stethoscope, color: "text-red-500", bgColor: "bg-red-50", label: "Krank" },
};

function ShiftBadge({ type }: { type: string }) {
  const info = ShiftTypes[type as keyof typeof ShiftTypes] || ShiftTypes.early;
  const Icon = info.icon;
  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${info.bgColor} border border-gray-200`}>
      <Icon className={`h-4 w-4 ${info.color}`} />
      <span className="text-sm font-medium">{info.label}</span>
    </div>
  );
}

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
}

export function ScheduleBoard({ selectedDate }: ScheduleBoardProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 7).toISOString(),
    }],
  });

  console.log('Current shifts:', shifts);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-gray-50">
          <div className="p-4 font-medium">Mitarbeiter</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-4 text-center">
              <div className="font-medium">{format(day, "EEEE", { locale: de })}</div>
              <div className="text-sm text-gray-500">{format(day, "dd.MM.")}</div>
            </div>
          ))}
        </div>

        <ScrollArea className="h-[calc(100vh-400px)]">
          {employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-[250px_repeat(7,1fr)] border-b">
              <div className="p-4">
                <div className="font-medium">{employee.name}</div>
              </div>

              {weekDays.map((day) => {
                const dayShifts = shifts.filter(shift => {
                  const shiftDate = format(new Date(shift.startTime), 'yyyy-MM-dd');
                  const currentDate = format(day, 'yyyy-MM-dd');
                  const matches = shift.employeeId === employee.id && shiftDate === currentDate;
                  console.log('Checking shift:', {
                    employeeId: shift.employeeId,
                    shiftDate,
                    currentDate,
                    matches
                  });
                  return matches;
                });

                return (
                  <div key={day.toISOString()} className="p-2 min-h-[100px] border-l">
                    {dayShifts.map((shift) => (
                      <ShiftBadge key={shift.id} type={shift.type} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ScheduleBoard;