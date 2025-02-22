import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function BillingPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Abrechnung
            </h1>
            <p className="text-lg text-gray-500">
              Verwalten Sie hier Abrechnungen und Rechnungen
            </p>
          </div>
          
          {/* Placeholder for billing content */}
          <div className="rounded-xl border border-white/20 bg-white/50 backdrop-blur-sm p-6 shadow-lg">
            <p className="text-gray-500">Abrechnungsverwaltung wird implementiert...</p>
          </div>
        </main>
      </div>
    </div>
  );
}
