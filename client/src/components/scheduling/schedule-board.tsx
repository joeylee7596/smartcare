import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
  useDraggable,
  DragOverlay,
} from "@dnd-kit/core";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sun,
  Moon,
  Coffee,
  Shield,
  Star,
  Sparkles,
  Plus,
  Pencil,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
};

function DraggableShiftTemplate({ type }: { type: keyof typeof ShiftTypes }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: type,
  });

  const info = ShiftTypes[type];
  const Icon = info.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 p-3 rounded-lg
        ${info.bgColor} border-2 border-dashed cursor-grab
        hover:border-solid hover:shadow-sm transition-all
        group relative
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <Icon className={`h-5 w-5 ${info.color} group-hover:scale-110 transition-transform`} />
      <div>
        <div className="font-medium">{info.label}</div>
        <div className="text-xs text-gray-500">{info.time}</div>
      </div>
    </div>
  );
}

function DroppableCell({ date, employeeId, children }: { date: Date; employeeId: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${employeeId}_${format(date, 'yyyy-MM-dd')}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        p-2 min-h-[100px] border-l relative
        ${isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}
        hover:bg-gray-50/50
        transition-all
      `}
    >
      {children}
    </div>
  );
}

function ShiftCard({ shift }: { shift: Shift }) {
  const info = ShiftTypes[shift.type as keyof typeof ShiftTypes];
  const Icon = info.icon;

  return (
    <motion.div
      className={`
        p-2 mb-1 rounded-md
        ${shift.aiOptimized ? 'bg-green-50 border-l-2 border-green-500' : `${info.bgColor} border`}
        hover:shadow-md transition-all
      `}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${info.color}`} />
          <span className="text-sm font-medium">
            {info.label}
          </span>
        </div>
        {shift.aiOptimized && (
          <Tooltip>
            <TooltipTrigger>
              <Sparkles className="h-4 w-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              KI-optimierte Schicht
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Get week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 6).toISOString(),
      department,
    }],
  });

  // Create new shift
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

      const res = await apiRequest("POST", "/api/shifts", {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
      });

      if (!res.ok) throw new Error("Neue Schicht konnte nicht erstellt werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const [employeeId, date] = over.id.toString().split("_");
    const type = active.id.toString();

    if (type && employeeId && date) {
      createShiftMutation.mutate({
        employeeId: parseInt(employeeId),
        type,
        date: new Date(date),
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card className="mt-6">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-4">
              {(Object.keys(ShiftTypes) as Array<keyof typeof ShiftTypes>).map((type) => (
                <DraggableShiftTemplate key={type} type={type} />
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

                    {/* Shift cells for each day */}
                    {weekDays.map((day) => {
                      const dayShifts = shifts.filter(s => 
                        s.employeeId === employee.id && 
                        format(new Date(s.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                      );

                      return (
                        <DroppableCell
                          key={day.toISOString()}
                          date={day}
                          employeeId={employee.id}
                        >
                          <AnimatePresence>
                            {dayShifts.map((shift) => (
                              <ShiftCard key={shift.id} shift={shift} />
                            ))}
                          </AnimatePresence>

                          {dayShifts.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                              <Plus className="h-5 w-5" />
                              <span className="text-xs mt-1">Schicht hinzufügen</span>
                            </div>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <DragOverlay>
        {activeId && (
          <DraggableShiftTemplate type={activeId as keyof typeof ShiftTypes} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default ScheduleBoard;