import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, RotateCw, Clock, Users, Route, Brain, Filter, Search, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker, Popup, Polyline, LatLngExpression } from 'react-leaflet';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, useDroppable, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "leaflet/dist/leaflet.css";
import { Icon } from 'leaflet';
import { CSS } from "@dnd-kit/utilities";

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

const center: LatLngExpression = [52.520008, 13.404954];

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

interface FilterState {
  urgency: string;
  careType: string;
  location: string;
}

export default function Tours() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    urgency: "all",
    careType: "all",
    location: "all"
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

  const dateFilteredTours = tours.filter(tour => {
    const tourDate = new Date(tour.date);
    return tourDate >= startOfDay(selectedDate) && tourDate <= endOfDay(selectedDate);
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filters.urgency === "all" || patient.careLevel >= 4; // Assuming careLevel >= 4 indicates urgency
    const matchesCareType = filters.careType === "all"; // TODO: Add care type to patient schema
    const matchesLocation = filters.location === "all"; // TODO: Add location districts
    return matchesSearch && matchesUrgency && matchesCareType && matchesLocation;
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
              {/* Left Column - Enhanced Patient List */}
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="space-y-3">
                    <CardTitle className="text-base">Patienten</CardTitle>

                    {/* Enhanced Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Patient suchen..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(selectedDate, "PPP", { locale: de })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Enhanced Filters */}
                    <div className="space-y-2">
                      <Select
                        value={filters.urgency}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Dringlichkeit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="urgent">Dringend</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.careType}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, careType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pflegeart" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="basic">Grundpflege</SelectItem>
                          <SelectItem value="medical">Medizinische Pflege</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={filters.location}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Standort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Bezirke</SelectItem>
                          <SelectItem value="north">Nord</SelectItem>
                          <SelectItem value="south">Süd</SelectItem>
                          <SelectItem value="east">Ost</SelectItem>
                          <SelectItem value="west">West</SelectItem>
                        </SelectContent>
                      </Select>
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
                    center={center}
                    zoom={13}
                    style={mapContainerStyle}
                    scrollWheelZoom
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {dateFilteredTours.map((tour) => (
                      tour.optimizedRoute?.waypoints.map((waypoint, index) => (
                        <Marker
                          key={`${tour.id}-${index}`}
                          position={[waypoint.lat, waypoint.lng] as LatLngExpression}
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
                    {dateFilteredTours.map((tour) => (
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