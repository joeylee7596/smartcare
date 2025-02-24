import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Sun, Moon, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Employee, Shift } from "@shared/schema";

// Shift type visuals
const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", label: "Früh" },
  late: { icon: Coffee, color: "text-orange-500", label: "Spät" },
  night: { icon: Moon, color: "text-blue-500", label: "Nacht" }
};

function ShiftBadge({ shift }: { shift: Shift }) {
  const info = ShiftTypes[shift.type as keyof typeof ShiftTypes];
  if (!info) return null;

  const Icon = info.icon;
  return (
    <div className="flex items-center gap-2 p-2 border rounded bg-white/80">
      <Icon className={`h-4 w-4 ${info.color}`} />
      <span className="text-sm">{info.label}</span>
      <span className="text-xs text-gray-500">
        {format(new Date(shift.startTime), 'HH:mm')}
      </span>
    </div>
  );
}

interface Props {
  selectedDate: Date;
}

export function ScheduleBoard({ selectedDate }: Props) {
  // Calculate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch data
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/employees']
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/shifts', {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 6).toISOString()
    }]
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-4">
          <div className="font-medium">Mitarbeiter</div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="text-center">
              <div className="font-medium">{format(day, "EEEE", { locale: de })}</div>
              <div className="text-sm text-gray-500">{format(day, "dd.MM.")}</div>
            </div>
          ))}

          <ScrollArea className="col-span-8">
            {employees.map(employee => (
              <div key={employee.id} className="grid grid-cols-[200px_repeat(7,1fr)] gap-4 mt-4">
                <div className="font-medium">{employee.name}</div>
                {weekDays.map(day => {
                  const dayShifts = shifts.filter(shift => 
                    shift.employeeId === employee.id && 
                    format(new Date(shift.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  );

                  return (
                    <div key={day.toISOString()} className="space-y-2">
                      {dayShifts.map(shift => (
                        <ShiftBadge key={shift.id} shift={shift} />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScheduleBoard;