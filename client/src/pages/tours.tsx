import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Brain } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Drag & Drop imports
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, useDroppable, DragOverlay } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function DraggablePatient({ patient, listeners, attributes, style }: { 
  patient: Patient;
  listeners?: any;
  attributes?: any;
  style?: any;
}) {
  return (
    <div
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 mb-2 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200 cursor-move"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{patient.name}</h3>
          <p className="text-sm text-muted-foreground">{patient.address}</p>
        </div>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function DroppableTour({ tour, children }: { tour: Tour; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: tour.id.toString(),
  });

  return (
    <div 
      ref={setNodeRef}
      className={`mb-4 ${isOver ? 'bg-primary/5 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}

function NewTourDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "new-tour",
  });

  return (
    <div
      ref={setNodeRef}
      className={`mt-4 p-4 rounded-lg border-2 border-dashed border-border/40 
        ${isOver ? 'bg-primary/10' : 'bg-muted/20'} 
        text-center transition-colors duration-200`}
    >
      <p className="text-sm text-muted-foreground">
        Patient hier ablegen für neue Tour
      </p>
    </div>
  );
}

export default function Tours() {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createTourMutation = useMutation({
    mutationFn: async (newTour: InsertTour) => {
      const res = await apiRequest("POST", "/api/tours", newTour);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour erstellt",
        description: "Die Tour wurde erfolgreich erstellt.",
      });
    },
  });

  const updateTourMutation = useMutation({
    mutationFn: async ({ id, patientIds }: { id: number; patientIds: number[] }) => {
      const res = await apiRequest("PATCH", `/api/tours/${id}`, { patientIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour aktualisiert",
        description: "Die Tour wurde erfolgreich aktualisiert.",
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setActiveId(active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedPatientId = active.id as number;

    if (over.id === "new-tour") {
      // Create new tour
      const newTour: InsertTour = {
        date: new Date(),
        caregiverId: 1, // TODO: Get from auth context
        patientIds: [draggedPatientId],
        status: "scheduled",
      };

      createTourMutation.mutate(newTour);
    } else {
      // Update existing tour
      const tourId = parseInt(over.id.toString());
      const tour = tours.find(t => t.id === tourId);
      if (!tour) return;

      const updatedPatientIds = [...tour.patientIds, draggedPatientId];
      updateTourMutation.mutate({ id: tourId, patientIds: updatedPatientIds });
    }
  };

  const draggedPatient = activeId ? patients.find(p => p.id === activeId) : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Tourenplanung
            </h1>
            <p className="text-sm text-muted-foreground">
              Planen und optimieren Sie die täglichen Routen
            </p>
          </div>

          <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-[350px,1fr,350px] gap-6">
              {/* Left Column - Patient List */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-medium mb-4">Patienten</h2>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    {patients.map((patient) => (
                      <DraggablePatient 
                        key={patient.id} 
                        patient={patient}
                      />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Center Column - Map (placeholder for now) */}
              <Card>
                <CardContent className="p-4">
                  <div className="h-[calc(100vh-350px)] bg-muted/20 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Kartenansicht</p>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Tours */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-medium mb-4">Touren</h2>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    {tours.map((tour) => (
                      <DroppableTour key={tour.id} tour={tour}>
                        <div className="p-4 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(new Date(tour.date), "HH:mm")}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {tour.optimizedRoute?.estimatedDuration} min
                            </span>
                          </div>
                          <div className="space-y-2">
                            {tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                  {index + 1}
                                </div>
                                <span>Patient #{waypoint.patientId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DroppableTour>
                    ))}

                    <NewTourDropZone />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <DragOverlay>
              {draggedPatient ? (
                <DraggablePatient 
                  patient={draggedPatient}
                  style={{
                    transform: CSS.Transform.toString({
                      x: 0,
                      y: 0,
                      scaleX: 1.05,
                      scaleY: 1.05,
                    }),
                  }}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}