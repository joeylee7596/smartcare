import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InsuranceBilling, Patient } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Send, CheckCircle, AlertCircle, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillingCardProps {
  billing: InsuranceBilling;
  patient: Patient;
  onSubmit: () => void;
}

export function BillingCard({ billing, patient, onSubmit }: BillingCardProps) {
  const statusColors = {
    pending: "text-yellow-600 bg-yellow-50",
    submitted: "text-blue-600 bg-blue-50",
    approved: "text-green-600 bg-green-50",
    rejected: "text-red-600 bg-red-50",
  } as const;

  const statusIcons: Record<string, LucideIcon> = {
    pending: AlertCircle,
    submitted: Send,
    approved: CheckCircle,
    rejected: AlertCircle,
  };

  const StatusIcon = statusIcons[billing.status] || AlertCircle;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Rechnung #{billing.id}</span>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-sm flex items-center gap-1",
            statusColors[billing.status as keyof typeof statusColors]
          )}>
            <StatusIcon className="h-4 w-4" />
            <span className="capitalize">{billing.status}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium">{patient.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versicherung</span>
            <span className="font-medium">{patient.insuranceProvider}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versicherungsnummer</span>
            <span className="font-medium">{patient.insuranceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Datum</span>
            <span className="font-medium">
              {format(new Date(billing.date), "dd. MMMM yyyy", { locale: de })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Betrag</span>
            <span className="font-medium">{Number(billing.totalAmount).toFixed(2)} €</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Leistungen</h4>
          <div className="space-y-1">
            {billing.services.map((service, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{service.description}</span>
                <span className="font-medium">{service.amount.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>

        {billing.status === "pending" && (
          <Button className="w-full" onClick={onSubmit}>
            <Send className="mr-2 h-4 w-4" />
            An Krankenkasse senden
          </Button>
        )}
      </CardContent>
    </Card>
  );
}