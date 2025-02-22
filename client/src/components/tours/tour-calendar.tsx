import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Tour, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, DragStartEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users as UsersIcon, MapPin, Calendar, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { clsx } from "clsx";

interface TourCalendarProps {
  tours: Tour[];
  employees: Employee[];
  selectedDate: Date;
  onTourUpdate: (tourId: number, newTime: Date) => Promise<void>;
}

export function TourCalendar({ tours, employees, selectedDate, onTourUpdate }: TourCalendarProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Only show business hours 6:00 - 22:00
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const date = new Date(selectedDate);
    date.setHours(i + 6, 0, 0, 0);
    return date;
  });

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      setIsDragging(false);
      setActiveId(null);

      if (!over || !active) return;

      const tourId = parseInt(active.id.toString());
      const timeSlot = parseInt(over.id.toString()) + 6; // Adjust for business hours offset

      if (isNaN(tourId) || isNaN(timeSlot)) {
        toast({
          variant: "destructive",
          title: "Fehler",
          description: "Ungültige Tour oder Zeitslot",
        });
        return;
      }

      const newDate = new Date(selectedDate);
      newDate.setHours(timeSlot, 0, 0, 0);

      await onTourUpdate(tourId, newDate);
    } catch (error) {
      console.error('Error in drag end handler:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Die Tour konnte nicht verschoben werden",
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-[120px,1fr] gap-2">
        <ScrollArea className="h-[600px]">
          <div className="space-y-2 pr-2">
            {timeSlots.map((time, index) => (
              <div
                key={index}
                className="h-16 flex items-center justify-end pr-2 text-sm text-gray-500"
              >
                {format(time, "HH:mm")}
              </div>
            ))}
          </div>
        </ScrollArea>

        <ScrollArea className="h-[600px]">
          <SortableContext items={tours.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pr-4">
              {timeSlots.map((time, index) => {
                const toursInSlot = tours.filter(tour =>
                  isSameDay(new Date(tour.date), selectedDate) &&
                  new Date(tour.date).getHours() === time.getHours()
                );

                return (
                  <div
                    key={index}
                    id={index.toString()}
                    className={clsx(
                      "h-16 relative droppable-area",
                      "border-b border-dashed border-gray-200",
                      index % 2 === 0 && "bg-gray-50/50"
                    )}
                    data-time={index}
                  >
                    <AnimatePresence>
                      {toursInSlot.map((tour) => {
                        const employee = employees.find(e => e.id === tour.employeeId);
                        if (!employee) return null;

                        return (
                          <motion.div
                            key={tour.id}
                            layoutId={tour.id.toString()}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute inset-0 p-1"
                          >
                            <Card
                              className={clsx(
                                "h-full group cursor-grab active:cursor-grabbing",
                                "transition-all duration-200 hover:shadow-lg",
                                activeId === tour.id && "ring-2 ring-primary ring-offset-2",
                                isDragging && "opacity-50"
                              )}
                            >
                              <CardContent className="p-2 h-full">
                                <div className="flex items-center justify-between h-full">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-blue-100">
                                      <UsersIcon className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{employee.name}</p>
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Clock className="h-3 w-3" />
                                        <span>{format(new Date(tour.date), "HH:mm")}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {tour.optimizationScore && (
                                      <div className="flex items-center">
                                        <Brain className="h-3 w-3 text-purple-500" />
                                        <span className="text-xs ml-1">{tour.optimizationScore}%</span>
                                      </div>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {tour.patientIds.length} Patienten
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </DndContext>
  );
}