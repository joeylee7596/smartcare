import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Activity, Users, CalendarDays, ClipboardList, Clock, AlertTriangle,
  Euro, Brain, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { Patient, Tour, Documentation } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { sendMessage, subscribe } = useWebSocket();
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  const pendingDocs = docs.filter(doc => doc.status === "pending");
  const criticalPatients = patients.filter(patient => patient.careLevel >= 4);

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'CRITICAL_ALERT') {
        setCriticalAlerts(prev => [...prev, message.data]);
      }
    });
    return () => unsubscribe();
  }, [subscribe]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex">
        <div className="flex-1 min-w-0">
          <Header />
          <main className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Willkommen zurück, {user?.name}
              </h1>
              <p className="text-lg text-muted-foreground">
                {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <OverviewCard
                title="Aktive Patienten"
                value={patients.length}
                description={`${criticalPatients.length} kritische Fälle`}
                icon={Users}
                trend="up"
                className="bg-blue-50 border-blue-100"
              />
              <OverviewCard
                title="Heutige Touren"
                value={todaysTours.length}
                description={`Nächste: ${todaysTours[0] ? format(new Date(todaysTours[0].date), "HH:mm") : '--:--'}`}
                icon={CalendarDays}
                trend="neutral"
                className="bg-green-50 border-green-100"
              />
              <OverviewCard
                title="Ausstehende Dokumentation"
                value={pendingDocs.length}
                description="Zu vervollständigende Berichte"
                icon={ClipboardList}
                trend="down"
                className="bg-amber-50 border-amber-100"
              />
              <OverviewCard
                title="Aktive Warnungen"
                value={criticalAlerts.length}
                description="Kritische Meldungen"
                icon={AlertTriangle}
                trend="up"
                className="bg-red-50 border-red-100"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
              {/* Main Content - 5 columns */}
              <div className="lg:col-span-5 space-y-6">
                {/* Critical Alerts */}
                {criticalAlerts.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Kritische Meldungen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {criticalAlerts.map((alert, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-red-100">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-1" />
                            <div>
                              <h4 className="font-medium text-red-900">{alert.title}</h4>
                              <p className="text-sm text-red-700">{alert.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Active Tours */}
                <Card>
                  <CardHeader>
                    <CardTitle>Aktive Touren</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {todaysTours.map((tour) => (
                        <div key={tour.id} className="flex items-center gap-4 p-4 bg-card rounded-lg border">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Tour #{tour.id}</p>
                              <Badge variant={tour.status === 'completed' ? 'success' : tour.status === 'in_progress' ? 'warning' : 'default'}>
                                {tour.status === 'completed' ? 'Abgeschlossen' : tour.status === 'in_progress' ? 'In Bearbeitung' : 'Ausstehend'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {tour.patientIds.length} Patienten
                            </p>
                          </div>
                          <div className="text-sm font-medium">
                            {format(new Date(tour.date), "HH:mm")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Insights */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      KI-Empfehlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-card rounded-lg border">
                        <p className="text-sm">Die KI-Analyse zeigt potenzielle Optimierungen für die Tourenplanung. Basierend auf historischen Daten könnten die Routen effizienter gestaltet werden.</p>
                        <Button variant="link" className="mt-2 h-8 px-0">Details anzeigen</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Sidebar - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Schnellzugriff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Link href="/patients/new">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="mr-2 h-4 w-4" />
                          Patient aufnehmen
                        </Button>
                      </Link>
                      <Link href="/tours/new">
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          Tour planen
                        </Button>
                      </Link>
                      <Link href="/documentation/new">
                        <Button variant="outline" className="w-full justify-start">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Dokumentation erstellen
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {tours.map((tour) => (
                          <div key={tour.id} className="flex items-center gap-2 text-sm">
                            {tour.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : tour.status === 'in_progress' ? (
                              <Clock className="h-4 w-4 text-amber-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="flex-1">Tour #{tour.id}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(tour.date), "HH:mm")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Financial Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Euro className="h-5 w-5" />
                      Abrechnungsstatus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Offene Rechnungen</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Fällige Zahlungen</span>
                        <span className="font-medium">2</span>
                      </div>
                      <Button variant="outline" className="w-full">
                        Zur Abrechnung
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}