import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Timer, Plus } from "phosphor-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { ExpiryTracking } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function ExpiryTrackingPage() {
  const { toast } = useToast();

  // Fetch all expiry items
  const { data: items, isLoading } = useQuery<ExpiryTracking[]>({
    queryKey: ["/api/expiry"],
  });

  // Fetch items nearing expiry
  const { data: nearingExpiry } = useQuery<ExpiryTracking[]>({
    queryKey: ["/api/expiry/nearing-expiry"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/expiry/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expiry"] });
      toast({
        title: "Eintrag gelöscht",
        description: "Der Eintrag wurde erfolgreich gelöscht.",
      });
    },
  });

  const getStatusColor = (expiryDate: string) => {
    const daysUntilExpiry = differenceInDays(parseISO(expiryDate), new Date());
    if (daysUntilExpiry <= 7) return "text-red-500";
    if (daysUntilExpiry <= 30) return "text-yellow-500";
    return "text-green-500";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Verfallsdatum-Tracking</h1>
        <Button>
          <Plus className="w-5 h-5 mr-2" />
          Neuer Eintrag
        </Button>
      </div>

      {nearingExpiry && nearingExpiry.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Warnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              {nearingExpiry.length} Artikel nähern sich dem Verfallsdatum
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alle Einträge</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artikel</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Verfallsdatum</TableHead>
                <TableHead>Menge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell>{item.itemType}</TableCell>
                  <TableCell className={getStatusColor(item.expiryDate)}>
                    {format(parseISO(item.expiryDate), "dd.MM.yyyy", { locale: de })}
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>{item.status}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Möchten Sie diesen Eintrag wirklich löschen?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      Löschen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}