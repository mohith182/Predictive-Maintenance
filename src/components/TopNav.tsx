import { Search, Bell, User, Activity, Wifi, WifiOff, LayoutDashboard, List, LogOut, AlertTriangle, XCircle, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/services/authService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Alert } from "@/lib/api";

interface TopNavProps {
  onSearch: (query: string) => void;
  alertCount: number;
  alerts?: Alert[];
  isConnected?: boolean;
  onSelectMachine?: (machineId: string) => void;
}

const TopNav = ({ onSearch, alertCount, alerts = [], isConnected = false, onSelectMachine }: TopNavProps) => {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if logout API call fails
      navigate('/login');
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    return `${Math.round(diff / 60)}h ago`;
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-strong sticky top-0 z-50 px-4 py-3 md:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-primary">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-mono text-sm font-bold tracking-wider text-primary text-glow-primary">
              Maintenix AI
            </h1>
            <p className="text-[10px] text-muted-foreground">Predictive Maintenance</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              isActive('/dashboard') 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate('/fleet')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              isActive('/fleet') 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
            Fleet
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Machine ID..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </form>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Real-time Connection Status */}
          <div className={`hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5 ${
            isConnected ? 'bg-success/10' : 'bg-warning/10'
          }`}>
            {isConnected && (
              <>
                <Wifi className="h-3.5 w-3.5 text-success" />
                <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
                <span className="font-mono text-xs text-success">LIVE</span>
              </>
            )}
          </div>

          {/* Alerts */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative rounded-lg p-2 transition-colors hover:bg-secondary">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {alertCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {alertCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-foreground">
                  Notifications
                </h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {unacknowledgedAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 p-4">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-sm text-muted-foreground">All clear — no active alerts</span>
                  </div>
                ) : (
                  <div className="divide-y">
                    {unacknowledgedAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        onClick={() => {
                          onSelectMachine?.(alert.machineId);
                        }}
                        className={`w-full text-left p-3 transition-colors hover:bg-secondary ${
                          alert.severity === 'critical'
                            ? 'bg-destructive/5'
                            : 'bg-warning/5'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {alert.severity === 'critical' ? (
                            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {alert.machineId}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatTime(alert.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-secondary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {authService.getUser()?.email || 'User'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.nav>
  );
};

export default TopNav;
