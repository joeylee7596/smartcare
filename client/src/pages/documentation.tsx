import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc } from "@shared/schema";

export default function Documentation() {
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <h1 className="text-3xl font-bold mb-8">Dokumentation</h1>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => {
              const { data: docs = [] } = useQuery<Doc[]>({
                queryKey: ["/api/patients", patient.id, "docs"],
              });

              return (
                <Card key={patient.id}>
                  <CardHeader>
                    <CardTitle>{patient.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 border rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {doc.type}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(doc.date), "dd.MM.yyyy HH:mm", {
                                  locale: de,
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{doc.content}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}