import { Search, Bell, User, Activity } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface TopNavProps {
  onSearch: (query: string) => void;
  alertCount: number;
}

const TopNav = ({ onSearch, alertCount }: TopNavProps) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchValue);
  };

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
              MOS101
            </h1>
            <p className="text-[10px] text-muted-foreground">Predictive Maintenance</p>
          </div>
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
          {/* System Status */}
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
            <span className="font-mono text-xs text-success">SYSTEM ONLINE</span>
          </div>

          {/* Alerts */}
          <button className="relative rounded-lg p-2 transition-colors hover:bg-secondary">
            <Bell className="h-5 w-5 text-muted-foreground" />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {alertCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <button className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-secondary">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
              <User className="h-4 w-4 text-primary" />
            </div>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default TopNav;
