import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Employee, Shift } from "@shared/schema";

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
  onOptimize: () => void;
}

const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Früh", time: "06:00 - 14:00" },
  late: { icon: Coffee, color: "text-orange-500", bgColor: "bg-orange-50", label: "Spät", time: "14:00 - 22:00" },
  night: { icon: Moon, color: "text-blue-500", bgColor: "bg-blue-50", label: "Nacht", time: "22:00 - 06:00" },
} as const;

function ShiftTemplate({ type }: { type: keyof typeof ShiftTypes }) {
  const info = ShiftTypes[type];
  const Icon = info.icon;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`
        flex items-center gap-3 p-4 rounded-xl
        ${info.bgColor} bg-opacity-90
        backdrop-blur-sm
        border border-white/20
        shadow-lg shadow-${info.color}/10
        hover:shadow-xl hover:scale-[1.02]
        cursor-grab group
        transition-all duration-300 ease-out
        transform perspective-1000
        hover:rotate-1
      `}
      style={{
        background: `linear-gradient(135deg, ${info.bgColor}, rgba(255,255,255,0.9))`,
      }}
    >
      <div className="p-2 rounded-lg bg-white/30 backdrop-blur-sm">
        <Icon className={`h-6 w-6 ${info.color} group-hover:scale-110 transition-transform`} />
      </div>
      <div>
        <div className="font-semibold text-gray-800">{info.label}</div>
        <div className="text-sm text-gray-600">{info.time}</div>
      </div>
    </div>
  );
}

function ShiftCard({ shift }: { shift: Shift }) {
  const info = ShiftTypes[shift.type as keyof typeof ShiftTypes];
  const Icon = info.icon;

  return (
    <motion.div
      className={`
        p-3 mb-2 rounded-lg
        ${shift.aiOptimized
          ? 'bg-gradient-to-br from-green-50 to-emerald-50/90 border-l-2 border-green-500'
          : `bg-gradient-to-br from-${info.bgColor} to-white/90 border border-white/20`
        }
        backdrop-blur-sm
        shadow-sm hover:shadow-md
        transform perspective-1000
        hover:-translate-y-0.5
        transition-all duration-300
      `}
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-white/50 backdrop-blur-sm">
            <Icon className={`h-4 w-4 ${info.color}`} />
          </div>
          <span className="font-medium text-gray-800">{info.label}</span>
        </div>
        {shift.aiOptimized && (
          <Tooltip>
            <TooltipTrigger>
              <div className="p-1 rounded-full bg-green-100/50 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent>KI-optimierte Schicht</TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Query for employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  // Query for shifts with explicit date range
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", { start: weekStart, end: weekEnd, department }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shifts", {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Failed to fetch shifts");
      const data = await res.json();
      console.log('Fetched shifts:', data); // Debug log
      return data;
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: string; date: Date }) => {
      let startTime = new Date(data.date);
      let endTime = new Date(data.date);

      switch (data.type) {
        case "early":
          startTime.setHours(6, 0);
          endTime.setHours(14, 0);
          break;
        case "late":
          startTime.setHours(14, 0);
          endTime.setHours(22, 0);
          break;
        case "night":
          startTime.setHours(22, 0);
          endTime = addDays(endTime, 1);
          endTime.setHours(6, 0);
          break;
      }

      const shiftData = {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
        breakDuration: 30,
        conflictInfo: {
          type: "overlap",
          description: "Checking for conflicts",
          severity: "low",
          status: "pending"
        },
        notes: "",
        aiGenerated: false,
        aiOptimized: false,
        status: "scheduled"
      };

      console.log('Creating shift with data:', shiftData); // Debug log

      const res = await apiRequest("POST", "/api/shifts", shiftData);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Schicht konnte nicht erstellt werden");
      }

      const newShift = await res.json();
      console.log('Created shift:', newShift); // Debug log
      return newShift;
    },
    onSuccess: (newShift) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });

      // Optimistically update the local data
      queryClient.setQueryData<Shift[]>(["/api/shifts", { start: weekStart, end: weekEnd, department }], (old = []) => {
        return [...old, newShift];
      });

      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Schicht konnte nicht erstellt werden",
        variant: "destructive",
      });
      console.error("Error creating shift:", error);
    },
  });

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, employeeId: number, date: Date) => {
    e.preventDefault();
    setDragOverCell(null);

    const shiftType = e.dataTransfer.getData('text/plain');
    if (!shiftType) return;

    try {
      await createShiftMutation.mutateAsync({
        employeeId,
        type: shiftType,
        date,
      });
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  // Debug log for current shifts
  console.log('Current shifts:', shifts);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(ShiftTypes) as Array<keyof typeof ShiftTypes>).map((type) => (
              <ShiftTemplate key={type} type={type} />
            ))}
          </div>
          <Button
            onClick={onOptimize}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            KI-Optimierung
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="min-w-[1200px]">
            {/* Header row with dates */}
            <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b">
              <div className="p-4 font-medium">Mitarbeiter</div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-4 text-center ${
                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-blue-50'
                      : ''
                  }`}
                >
                  <div className="font-medium">
                    {format(day, "EEEE", { locale: de })}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(day, "dd.MM.")}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            <div>
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50/50"
                >
                  {/* Employee info */}
                  <div className="p-4">
                    <div className="font-medium">{employee.name}</div>
                  </div>

                  {/* Shift cells for each day */}
                  {weekDays.map((day) => {
                    const dayShifts = shifts.filter(s => {
                      const shiftDate = format(new Date(s.startTime), 'yyyy-MM-dd');
                      const currentDate = format(day, 'yyyy-MM-dd');
                      return s.employeeId === employee.id && shiftDate === currentDate;
                    });

                    const cellId = `${employee.id}_${format(day, 'yyyy-MM-dd')}`;

                    // Debug log for shifts in this cell
                    console.log(`Shifts for ${cellId}:`, dayShifts);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`
                          p-2 min-h-[120px] relative
                          border-l 
                          ${dragOverCell === cellId 
                            ? 'bg-blue-50/80 border-2 border-dashed border-blue-300 backdrop-blur-sm' 
                            : 'hover:bg-gray-50/50'
                          }
                          transition-all duration-300
                          rounded-lg
                        `}
                        onDragOver={(e) => handleDragOver(e, cellId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, employee.id, day)}
                      >
                        <AnimatePresence>
                          {dayShifts.map((shift) => (
                            <ShiftCard key={shift.id} shift={shift} />
                          ))}
                        </AnimatePresence>

                        {dayShifts.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                            <div className="p-2 rounded-full bg-gray-50/80 backdrop-blur-sm">
                              <Plus className="h-5 w-5" />
                            </div>
                            <span className="text-xs mt-2 font-medium">Schicht hinzufügen</span>
                          </div>
                        )}
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
  );
}

export default ScheduleBoard;