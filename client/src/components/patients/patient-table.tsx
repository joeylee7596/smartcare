import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { Patient } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PatientTableProps {
  patients: Patient[];
}

export function PatientTable({ patients }: PatientTableProps) {
  const { toast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/patients/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient gelöscht",
        description: "Der Patient wurde erfolgreich gelöscht.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Patient konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Pflegegrad</TableHead>
          <TableHead>Adresse</TableHead>
          <TableHead>Notfallkontakt</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((patient) => (
          <TableRow key={patient.id}>
            <TableCell className="font-medium">{patient.name}</TableCell>
            <TableCell>{patient.careLevel}</TableCell>
            <TableCell>{patient.address}</TableCell>
            <TableCell>{patient.emergencyContact}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(patient.id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
