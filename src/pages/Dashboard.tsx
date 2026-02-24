import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import FleetStats from "@/components/FleetStats";
import FleetOverview from "@/components/FleetOverview";
import MachineDetail from "@/components/MachineDetail";
import AlertsPanel from "@/components/AlertsPanel";
import { machines, alerts, getFleetSummary, getMachineById } from "@/lib/mockData";

const Dashboard = () => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>(machines[0].machineId);
  const summary = getFleetSummary();
  const selectedMachine = getMachineById(selectedMachineId);
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const found = getMachineById(query);
    if (found) setSelectedMachineId(found.machineId);
  };

  const handleSelectMachine = (id: string) => {
    setSelectedMachineId(id);
  };

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <TopNav onSearch={handleSearch} alertCount={unacknowledgedAlerts.length} />

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Fleet Stats */}
        <FleetStats {...summary} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Fleet List + Alerts */}
          <div className="lg:col-span-3 space-y-4">
            <div className="glass rounded-xl p-4">
              <FleetOverview
                machines={machines}
                selectedId={selectedMachineId}
                onSelect={handleSelectMachine}
              />
            </div>
            <AlertsPanel alerts={alerts} onSelectMachine={handleSelectMachine} />
          </div>

          {/* Main - Machine Detail */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {selectedMachine && (
                <MachineDetail key={selectedMachine.machineId} machine={selectedMachine} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
