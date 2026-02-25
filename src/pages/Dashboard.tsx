import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import FleetStats from "@/components/FleetStats";
import FleetOverview from "@/components/FleetOverview";
import MachineDetail from "@/components/MachineDetail";
import AlertsPanel from "@/components/AlertsPanel";
import { useMachines, useAlerts, useFleetSummary } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Fetch data from API
  const { data: machines = [], isLoading: machinesLoading, error: machinesError } = useMachines();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: summary, isLoading: summaryLoading } = useFleetSummary();

  // Set initial selected machine when data loads
  useEffect(() => {
    if (machines.length > 0 && !selectedMachineId) {
      setSelectedMachineId(machines[0].machineId);
    }
  }, [machines, selectedMachineId]);

  const selectedMachine = machines.find(m => m.machineId === selectedMachineId);
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const found = machines.find(
      m => m.machineId.toLowerCase() === query.toLowerCase() || 
           m.name.toLowerCase().includes(query.toLowerCase())
    );
    if (found) setSelectedMachineId(found.machineId);
  };

  const handleSelectMachine = (id: string) => {
    setSelectedMachineId(id);
  };

  const isLoading = machinesLoading || summaryLoading;

  if (machinesError) {
    return (
      <div className="min-h-screen bg-background grid-pattern">
        <TopNav onSearch={handleSearch} alertCount={0} />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-500">Connection Error</h2>
            <p className="text-muted-foreground">
              Unable to connect to the backend API. Make sure the FastAPI server is running.
            </p>
            <p className="text-sm text-muted-foreground">
              Run: <code className="bg-muted px-2 py-1 rounded">uvicorn main:app --reload</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <TopNav onSearch={handleSearch} alertCount={unacknowledgedAlerts.length} />

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Fleet Stats */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : summary ? (
          <FleetStats {...summary} />
        ) : null}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Fleet List + Alerts */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass rounded-xl p-4">
              {machinesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : (
                <FleetOverview
                  machines={machines}
                  selectedId={selectedMachineId}
                  onSelect={handleSelectMachine}
                />
              )}
            </div>
            <AlertsPanel alerts={alerts} onSelectMachine={handleSelectMachine} />
          </div>

          {/* Main - Machine Detail */}
          <div className="lg:col-span-9">
            {machinesLoading ? (
              <div className="glass rounded-xl p-6 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-64 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {selectedMachine && (
                  <MachineDetail key={selectedMachine.machineId} machine={selectedMachine} />
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
