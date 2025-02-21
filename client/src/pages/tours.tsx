import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient, type InsertTour } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, RotateCw, Clock, Calendar, Search, Plus, X, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "leaflet/dist/leaflet.css";
import { Icon } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PatientDetailsDialog } from "@/components/patients/patient-details-dialog";

// Fix for default marker icon
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const compactMapStyle = {
  width: "100%",
  height: "300px",
};

const expandedMapStyle = {
  width: "100%",
  height: "80vh",
};

const center: LatLngExpression = [52.520008, 13.404954];

interface PatientCardProps {
  patient: Patient;
  onAdd: (patientId: number) => void;
  isInTour?: boolean;
  onSelect: (patient: Patient) => void;
}

function PatientCard({ patient, onAdd, isInTour, onSelect }: PatientCardProps) {
  return (
    <div
      className="p-3 mb-2 rounded-lg bg-card border border-border/40 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onSelect(patient)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{patient.name}</h3>
            <Badge variant={patient.careLevel >= 4 ? "destructive" : "secondary"}>
              PG {patient.careLevel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{patient.address}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(patient.id);
                }}
                disabled={isInTour}
              >
                {isInTour ? (
                  <X className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isInTour ? 'Patient bereits in Tour' : 'Zur Tour hinzufügen'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
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
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const createTourMutation = useMutation({
    mutationFn: async (patientId: number) => {
      const tourDate = new Date(selectedDate);
      tourDate.setHours(9, 0, 0, 0); // Set default time to 9:00

      const newTour: InsertTour = {
        date: tourDate.toISOString(), // Ensure we send ISO string for the date
        caregiverId: 1, // TODO: Get from auth context
        patientIds: [patientId],
        status: "scheduled",
        optimizedRoute: {
          waypoints: [{
            patientId: patientId,
            lat: 52.520008,
            lng: 13.404954
          }],
          totalDistance: 0,
          estimatedDuration: 30
        }
      };

      const response = await apiRequest("POST", "/api/tours", newTour);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tour');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour erstellt",
        description: "Die Tour wurde erfolgreich erstellt.",
      });
    },
    onError: (error) => {
      console.error('Tour creation error:', error);
      toast({
        title: "Fehler",
        description: error.message || "Die Tour konnte nicht erstellt werden.",
        variant: "destructive",
      });
    }
  });

  const updateTourMutation = useMutation({
    mutationFn: async ({ id, patientIds }: { id: number; patientIds: number[] }) => {
      const optimizedRoute = {
        waypoints: patientIds.map(patientId => ({
          patientId,
          lat: 52.520008,
          lng: 13.404954
        })),
        totalDistance: 0,
        estimatedDuration: patientIds.length * 30
      };

      const response = await apiRequest("PATCH", `/api/tours/${id}`, { patientIds, optimizedRoute });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tour');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tours"] });
      toast({
        title: "Tour aktualisiert",
        description: "Die Tour wurde erfolgreich aktualisiert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error.message || "Die Tour konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    }
  });

  const dateFilteredTours = tours.filter(tour => {
    const tourDate = parseISO(tour.date.toString());
    return tourDate >= startOfDay(selectedDate) && tourDate <= endOfDay(selectedDate);
  });

  const patientsInTours = dateFilteredTours.flatMap(tour => tour.patientIds);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = filters.urgency === "all" ||
      (filters.urgency === "urgent" && patient.careLevel >= 4) ||
      (filters.urgency === "normal" && patient.careLevel < 4);
    const matchesCareType = filters.careType === "all"; // TODO: Add care type to patient schema
    const matchesLocation = filters.location === "all"; // TODO: Add location districts
    return matchesSearch && matchesUrgency && matchesCareType && matchesLocation;
  });

  const handleAddToTour = async (patientId: number) => {
    createTourMutation.mutate(patientId);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background to-muted">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Tourenplanung</h1>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>

          <div className="grid grid-cols-[350px,1fr,350px] gap-6">
            {/* Left Column - Patient List */}
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
                    <PopoverContent className="w-auto p-0" style={{ zIndex: 100 }}>
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
                      <SelectContent style={{ zIndex: 100 }}>
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
                      <SelectContent style={{ zIndex: 100 }}>
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
                      <SelectContent style={{ zIndex: 100 }}>
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
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onAdd={handleAddToTour}
                      isInTour={patientsInTours.includes(patient.id)}
                      onSelect={setSelectedPatient}
                    />
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Center Column - Map */}
            <Card className="shadow-lg overflow-hidden relative">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Karte</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh]" style={{ zIndex: 1000 }}>
                    <div className="relative w-full h-full">
                      <MapContainer
                        center={center}
                        zoom={13}
                        style={expandedMapStyle}
                        scrollWheelZoom
                        className="relative"
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
                                  <p className="text-sm text-muted-foreground">
                                    {patients.find(p => p.id === waypoint.patientId)?.name || `Patient #${waypoint.patientId}`}
                                  </p>
                                </div>
                              </Popup>
                            </Marker>
                          ))
                        ))}
                      </MapContainer>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative" style={{ zIndex: 0 }}>
                  <MapContainer
                    center={center}
                    zoom={13}
                    style={compactMapStyle}
                    scrollWheelZoom
                    className="relative"
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
                          <Popup className="leaflet-popup-content-wrapper">
                            <div className="p-2">
                              <p className="font-medium">Stop {index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {patients.find(p => p.id === waypoint.patientId)?.name || `Patient #${waypoint.patientId}`}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))
                    ))}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Timeline */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Zeitplan</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-350px)]">
                  {dateFilteredTours.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>Keine Touren für diesen Tag geplant</p>
                      <p className="text-sm">Fügen Sie Patienten hinzu, um eine neue Tour zu erstellen</p>
                    </div>
                  ) : (
                    dateFilteredTours.map((tour) => (
                      <div
                        key={tour.id}
                        className="p-4 mb-4 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(parseISO(tour.date.toString()), "HH:mm")}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {tour.optimizedRoute?.estimatedDuration} min
                          </span>
                        </div>
                        <div className="space-y-2">
                          {tour.optimizedRoute?.waypoints.map((waypoint, index) => {
                            const patient = patients.find(p => p.id === waypoint.patientId);
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                                onClick={() => setSelectedPatient(patient || null)}
                              >
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                                  {index + 1}
                                </div>
                                <span className="flex-1 truncate">
                                  {patient?.name || `Patient #${waypoint.patientId}`}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTourMutation.mutate({
                                      id: tour.id,
                                      patientIds: tour.patientIds.filter(id => id !== waypoint.patientId)
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <PatientDetailsDialog
            patient={selectedPatient}
            open={!!selectedPatient}
            onOpenChange={(open) => !open && setSelectedPatient(null)}
          />
        </main>
      </div>
    </div>
  );
}