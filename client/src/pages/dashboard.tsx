import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Users, CalendarDays, ClipboardList } from "lucide-react";
import { Patient, Tour } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Willkommen zurück, {user?.name}
            </h1>
            <p className="text-muted-foreground">
              Hier ist Ihre Übersicht für heute
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <OverviewCard
              title="Aktive Patienten"
              value={patients.length}
              icon={Users}
            />
            <OverviewCard
              title="Heutige Touren"
              value={tours.length}
              icon={CalendarDays}
            />
            <OverviewCard
              title="Offene Aufgaben"
              value="3"
              icon={Activity}
            />
            <OverviewCard
              title="Ausstehende Dokumentation"
              value="5"
              icon={ClipboardList}
            />
          </div>
        </main>
      </div>
    </div>
  );
}