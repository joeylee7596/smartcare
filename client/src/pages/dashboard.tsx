import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Users, CalendarDays, ClipboardList, Clock } from "lucide-react";
import { Patient, Tour } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
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
              description="Insgesamt betreute Patienten"
              icon={Users}
              className="bg-blue-50"
            />
            <OverviewCard
              title="Heutige Touren"
              value={todaysTours.length}
              description={`Nächste Tour: ${todaysTours[0] ? format(new Date(todaysTours[0].date), "HH:mm") : '--:--'}`}
              icon={CalendarDays}
              className="bg-green-50"
            />
            <OverviewCard
              title="Offene Aufgaben"
              value="3"
              description="Aufgaben für heute"
              icon={Activity}
              className="bg-yellow-50"
            />
            <OverviewCard
              title="Ausstehende Dokumentation"
              value="5"
              description="Zu vervollständigende Berichte"
              icon={ClipboardList}
              className="bg-red-50"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Nächste Termine</CardTitle>
              </CardHeader>
              <CardContent>
                {todaysTours.length === 0 ? (
                  <p className="text-muted-foreground">Keine weiteren Termine für heute</p>
                ) : (
                  <div className="space-y-4">
                    {todaysTours.slice(0, 3).map((tour) => (
                      <div
                        key={tour.id}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            Tour #{tour.id}
                          </p>
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
                )}
                <Button variant="link" className="mt-4 w-full">
                  Alle Termine anzeigen
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schnellzugriff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button className="h-auto py-4 justify-start" variant="outline">
                    <Users className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Neuer Patient</div>
                      <div className="text-xs text-muted-foreground">Patient aufnehmen</div>
                    </div>
                  </Button>
                  <Button className="h-auto py-4 justify-start" variant="outline">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Tour planen</div>
                      <div className="text-xs text-muted-foreground">Neue Tour erstellen</div>
                    </div>
                  </Button>
                  <Button className="h-auto py-4 justify-start" variant="outline">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Dokumentieren</div>
                      <div className="text-xs text-muted-foreground">Bericht erfassen</div>
                    </div>
                  </Button>
                  <Button className="h-auto py-4 justify-start" variant="outline">
                    <Activity className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Aufgaben</div>
                      <div className="text-xs text-muted-foreground">Übersicht öffnen</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}