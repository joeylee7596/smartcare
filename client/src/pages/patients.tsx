import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { PatientTable } from "@/components/patients/patient-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Patienten</h1>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Patient hinzufügen
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Patienten suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <PatientTable patients={filteredPatients} />
        </main>
      </div>
    </div>
  );
}
