import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, Patient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, RotateCw, Clock, Users, Route, Brain, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DndContext, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import "leaflet/dist/leaflet.css";
import { Icon } from 'leaflet';

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

export default function Tours() {
  const [date, setDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    urgent: false,
    scheduled: false,
    completed: false,
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
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
                  <DndContext sensors={sensors}>
                    <SortableContext items={filteredPatients} strategy={verticalListSortingStrategy}>
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
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
                      ))}
                    </SortableContext>
                  </DndContext>
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
                    <div
                      key={tour.id}
                      className="mb-4 p-4 rounded-lg bg-card border border-border/40 hover:shadow-lg transition-all duration-200"
                    >
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
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}