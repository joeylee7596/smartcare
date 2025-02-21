import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, RotateCw, Clock, Users, Route, Brain, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, useDroppable, DraggableAttributes, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "leaflet/dist/leaflet.css";
import { Icon } from 'leaflet';
import { CSS } from "@dnd-kit/utilities";
import React from 'react';

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const mapContainerStyle = {
  width: "100%",
  height: "calc(100vh - 200px)",
};

const center = {
  lat: 52.520008,
  lng: 13.404954,
};

interface DraggablePatientProps {
  patient: Patient;
  isDragging?: boolean;
}

function DraggablePatient({ patient, isDragging }: DraggablePatientProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: patient.id,
    data: {
      type: 'patient',
      patient,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 mb-2 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200"
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

interface DroppableTourProps {
  tour: Tour;
  children: React.ReactNode;
}

function DroppableTour({ tour, children }: DroppableTourProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: tour.id.toString(),
  });

  return (
    <div 
      ref={setNodeRef}
      className={`mb-4 transition-colors duration-200 ${isOver ? 'bg-primary/5 rounded-lg' : ''}`}
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
        text-center transition-colors duration-200 hover:bg-muted/30`}
    >
      <p className="text-sm text-muted-foreground">
        Patient hier ablegen für neue Tour
      </p>
    </div>
  );
}

export default function Tours() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    urgent: false,
    scheduled: false,
    completed: false,
  });
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
    mutationFn: async ({ id, patientIds, optimizedRoute }: { id: number; patientIds: number[]; optimizedRoute: any }) => {
      const res = await apiRequest("PATCH", `/api/tours/${id}`, { patientIds, optimizedRoute });
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

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        date: new Date().toISOString(),
        caregiverId: 1, // TODO: Get from auth context
        patientIds: [draggedPatientId],
        status: "scheduled",
        optimizedRoute: {
          estimatedDuration: 30,
          waypoints: [{ 
            patientId: draggedPatientId,
            lat: 52.520008,
            lng: 13.404954
          }]
        }
      };

      createTourMutation.mutate(newTour);
    } else {
      // Update existing tour
      const tourId = parseInt(over.id.toString());
      if (isNaN(tourId)) return;

      const tour = tours.find(t => t.id === tourId);
      if (!tour) return;

      const updatedPatientIds = [...tour.patientIds, draggedPatientId];
      const updatedWaypoints = [
        ...(tour.optimizedRoute?.waypoints || []),
        { 
          patientId: draggedPatientId,
          lat: 52.520008,
          lng: 13.404954
        }
      ];

      updateTourMutation.mutate({ 
        id: tourId, 
        patientIds: updatedPatientIds,
        optimizedRoute: {
          estimatedDuration: updatedWaypoints.length * 30,
          waypoints: updatedWaypoints
        }
      });
    }
  };

  const draggedPatient = activeId ? patients.find(p => p.id === activeId) : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Tourenplanung</h1>
              <p className="text-sm text-muted-foreground">
                Planen und optimieren Sie die täglichen Routen
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>

          <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-[350px,1fr,350px] gap-6">
              {/* Left Column - Patient List */}
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    <CardTitle className="text-base">Patienten</CardTitle>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Suchen..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="urgent"
                          checked={selectedFilters.urgent}
                          onCheckedChange={(checked) =>
                            setSelectedFilters(prev => ({ ...prev, urgent: !!checked }))
                          }
                        />
                        <label htmlFor="urgent" className="text-sm">Dringend</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="scheduled"
                          checked={selectedFilters.scheduled}
                          onCheckedChange={(checked) =>
                            setSelectedFilters(prev => ({ ...prev, scheduled: !!checked }))
                          }
                        />
                        <label htmlFor="scheduled" className="text-sm">Geplant</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="completed"
                          checked={selectedFilters.completed}
                          onCheckedChange={(checked) =>
                            setSelectedFilters(prev => ({ ...prev, completed: !!checked }))
                          }
                        />
                        <label htmlFor="completed" className="text-sm">Abgeschlossen</label>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    {filteredPatients.map((patient) => (
                      <DraggablePatient 
                        key={patient.id} 
                        patient={patient}
                        isDragging={patient.id === activeId}
                      />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Center Column - Map */}
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={13}
                    style={mapContainerStyle}
                    scrollWheelZoom={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {todaysTours.map((tour) => (
                      tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                        <Marker
                          key={`${tour.id}-${index}`}
                          position={[waypoint.lat, waypoint.lng]}
                          icon={defaultIcon}
                        >
                          <Popup>
                            <div className="p-2">
                              <p className="font-medium">Stop {index + 1}</p>
                              <p className="text-sm text-muted-foreground">Patient #{waypoint.patientId}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    ))}
                  </MapContainer>
                </CardContent>
              </Card>

              {/* Right Column - Timeline */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Zeitplan</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-350px)]">
                    {todaysTours.map((tour) => (
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
                <DraggablePatient patient={draggedPatient} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>
      </div>
    </div>
  );
}