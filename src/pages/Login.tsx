import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Mail, KeyRound, ArrowRight } from "lucide-react";
import api from "../lib/api";

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate OTP send
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    }, 1500);
  };

  const handleOtpChange = async (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
    // Auto-submit when complete
    if (newOtp.every(d => d !== "")) {
      setLoading(true);
      // Store email in localStorage for alert notifications
      localStorage.setItem('userEmail', email);
      
      // Subscribe email for machine failure alerts
      try {
        await api.subscribeEmail(email);
        console.log('Email subscribed for alerts:', email);
      } catch (err) {
        console.log('Could not subscribe email for alerts:', err);
      }
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background grid-pattern flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-primary mb-4"
          >
            <Activity className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="font-mono text-2xl font-bold text-primary text-glow-primary tracking-wider">
            Maintenix AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Predictive Maintenance System
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-mono text-lg font-semibold text-foreground">Sign In</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your email to receive a one-time passcode
                  </p>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="operator@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-secondary/50 py-3 pl-10 pr-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-mono text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 glow-primary"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      Send OTP <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <h2 className="font-mono text-lg font-semibold text-foreground">Verify OTP</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the 6-digit code sent to <span className="text-primary">{email}</span>
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-12 w-10 rounded-lg border border-border bg-secondary/50 text-center font-mono text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                  ))}
                </div>
                {loading && (
                  <div className="flex justify-center">
                    <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }}
                    className="hover:text-primary transition-colors"
                  >
                    ← Change email
                  </button>
                  {countdown > 0 ? (
                    <span className="font-mono">Resend in {countdown}s</span>
                  ) : (
                    <button className="text-primary hover:underline">Resend code</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Secured by Maintenix AI Industrial Systems
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
