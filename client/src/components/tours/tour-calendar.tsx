import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Tour, Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, DragStartEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users as UsersIcon, MapPin, Calendar } from "lucide-react";
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
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(selectedDate);
    date.setHours(i, 0, 0, 0);
    return date;
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      const { active, over } = event;
      setIsDragging(false);
      setActiveId(null);

      if (!over || !active) {
        return;
      }

      const tourId = parseInt(active.id.toString());
      const timeSlot = parseInt(over.id.toString());

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
      <div className="grid grid-cols-[200px,1fr] gap-4">
        {/* Time slots */}
        <div className="space-y-2">
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className="h-20 flex items-center justify-end pr-4 text-sm text-gray-500"
            >
              {format(time, "HH:mm")}
            </div>
          ))}
        </div>

        {/* Tour slots */}
        <div className="relative border-l pl-4">
          <SortableContext items={tours.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {timeSlots.map((time, index) => {
                const toursInSlot = tours.filter(tour =>
                  isSameDay(new Date(tour.date), selectedDate) &&
                  new Date(tour.date).getHours() === time.getHours()
                );

                return (
                  <div
                    key={index}
                    id={index.toString()}
                    className="h-20 border-b border-dashed border-gray-200 relative droppable-area"
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
                                <div className="flex items-start justify-between h-full">
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
                                  <Badge variant="outline" className="text-xs">
                                    {tour.patientIds.length} Patienten
                                  </Badge>
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
        </div>
      </div>
    </DndContext>
  );
}