import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { useMachines, useFleetSummary, useAlerts } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Filter,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Gauge
} from "lucide-react";

type SortField = "machineId" | "name" | "healthScore" | "rul" | "status" | "location";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "healthy" | "warning" | "critical";

const FleetPage = () => {
  const navigate = useNavigate();
  const { data: machines = [], isLoading } = useMachines();
  const { data: summary } = useFleetSummary();
  const { data: alerts = [] } = useAlerts();
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("healthScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Status configuration
  const statusConfig = {
    healthy: { 
      icon: CheckCircle2, 
      className: "bg-green-500/10 text-green-500 border-green-500/20",
      label: "Healthy"
    },
    warning: { 
      icon: AlertTriangle, 
      className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      label: "Warning"
    },
    critical: { 
      icon: XCircle, 
      className: "bg-red-500/10 text-red-500 border-red-500/20",
      label: "Critical"
    },
  };

  // Filtered and sorted machines
  const filteredMachines = useMemo(() => {
    let result = [...machines];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.machineId.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.location.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(m => m.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "machineId":
          comparison = a.machineId.localeCompare(b.machineId);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "healthScore":
          comparison = a.healthScore - b.healthScore;
          break;
        case "rul":
          comparison = a.rul - b.rul;
          break;
        case "status":
          const statusOrder = { critical: 0, warning: 1, healthy: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "location":
          comparison = a.location.localeCompare(b.location);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [machines, searchQuery, statusFilter, sortField, sortDirection]);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  // Navigate to machine detail
  const handleMachineClick = (machineId: string) => {
    navigate(`/dashboard?machine=${machineId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopNav 
          onSearch={setSearchQuery} 
          alertCount={alerts.filter(a => !a.acknowledged).length}
          alerts={alerts}
        />
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav 
        onSearch={setSearchQuery} 
        alertCount={alerts.filter(a => !a.acknowledged).length}
        alerts={alerts}
      />
      
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Fleet Overview</h1>
            <p className="text-muted-foreground text-sm">
              Monitor and manage all machines in your fleet
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Activity className="h-4 w-4" />
              Total Machines
            </div>
            <div className="text-3xl font-bold font-mono">
              {summary?.totalMachines || machines.length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-green-500 text-xs mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Healthy
            </div>
            <div className="text-3xl font-bold font-mono text-green-500">
              {summary?.healthyCount || machines.filter(m => m.status === "healthy").length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-yellow-500 text-xs mb-2">
              <AlertTriangle className="h-4 w-4" />
              Warning
            </div>
            <div className="text-3xl font-bold font-mono text-yellow-500">
              {summary?.warningCount || machines.filter(m => m.status === "warning").length}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-red-500 text-xs mb-2">
              <XCircle className="h-4 w-4" />
              Critical
            </div>
            <div className="text-3xl font-bold font-mono text-red-500">
              {summary?.criticalCount || machines.filter(m => m.status === "critical").length}
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Machine Table */}
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("machineId")}
                >
                  <div className="flex items-center">
                    Machine ID
                    <SortIcon field="machineId" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("healthScore")}
                >
                  <div className="flex items-center">
                    <Gauge className="h-3 w-3 mr-1" />
                    Health
                    <SortIcon field="healthScore" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("rul")}
                >
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    RUL
                    <SortIcon field="rul" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    <SortIcon field="status" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Location
                    <SortIcon field="location" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.map((machine, index) => {
                const config = statusConfig[machine.status];
                const StatusIcon = config.icon;
                
                return (
                  <motion.tr
                    key={machine.machineId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => handleMachineClick(machine.machineId)}
                  >
                    <TableCell className="font-mono font-semibold">
                      {machine.machineId}
                    </TableCell>
                    <TableCell>{machine.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              machine.healthScore >= 70 ? "bg-green-500" :
                              machine.healthScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${machine.healthScore}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm">{machine.healthScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {machine.rul} days
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {machine.location}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMachineClick(machine.machineId);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
              
              {filteredMachines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No machines found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredMachines.length} of {machines.length} machines
        </div>
      </main>
    </div>
  );
};

export default FleetPage;
