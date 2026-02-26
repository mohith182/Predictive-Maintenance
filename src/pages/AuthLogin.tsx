import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Mail, KeyRound, ArrowRight, User, Lock, Eye, EyeOff, Chrome, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService, type MFARequiredResponse } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthStep = "login" | "signup" | "verify-email" | "mfa";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Form state
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  
  // MFA state
  const [tempToken, setTempToken] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Check if already logged in
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Handle email verification from URL
  useEffect(() => {
    const verifyToken = searchParams.get("verify");
    if (verifyToken) {
      handleEmailVerification(verifyToken);
    }
  }, [searchParams]);

  // Password validation
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number";
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) return "Password must contain a special character";
    return null;
  };

  // Handle email verification
  const handleEmailVerification = async (token: string) => {
    setLoading(true);
    try {
      const result = await authService.verifyEmail(token);
      setSuccess(result.message);
      setStep("login");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await authService.login({ email, password });
      
      // Check if MFA is required
      if ("mfa_required" in response && response.mfa_required) {
        const mfaResponse = response as MFARequiredResponse;
        setTempToken(mfaResponse.temp_token);
        setStep("mfa");
        setCountdown(300); // 5 minutes
        startCountdown();
        return;
      }
      
      // Login successful
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    // Validate password
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await authService.signUp({
        email,
        password,
        full_name: fullName || undefined,
      });
      
      setSuccess(result.message);
      setStep("verify-email");
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  // Handle MFA verification
  const handleMFAVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) return;
    
    setLoading(true);
    setError("");
    
    try {
      await authService.verifyOTP({
        email,
        otp_code: otpCode,
        temp_token: tempToken,
      });
      
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid code");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    // Note: In production, use Google Sign-In SDK
    setError("Google Sign-In requires configuration. Please use email/password.");
  };

  // OTP input handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
    
    // Auto-submit when complete
    if (newOtp.every(d => d !== "")) {
      setTimeout(handleMFAVerify, 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Countdown timer
  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
            UptimeAI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-Powered Predictive Maintenance
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6">
          <AnimatePresence mode="wait">
            {/* Login Form */}
            {step === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="font-semibold text-xl mb-4 text-center">Welcome Back</h2>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    {success}
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        Sign In <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>
                
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
                
                {/* Demo Login - Quick access for development */}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={() => {
                    // Store demo user in localStorage and navigate
                    localStorage.setItem('access_token', 'demo_token');
                    localStorage.setItem('user', JSON.stringify({
                      id: 'demo-user',
                      email: 'demo@uptimeai.com',
                      full_name: 'Demo User',
                      is_email_verified: true,
                      mfa_enabled: false,
                    }));
                    localStorage.setItem('userEmail', 'demo@uptimeai.com');
                    window.location.href = '/dashboard';
                  }}
                  disabled={loading}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Quick Demo Login
                </Button>
                
                {/* Sign Up Link */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("signup"); setError(""); setSuccess(""); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </motion.div>
            )}

            {/* Signup Form */}
            {step === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="font-semibold text-xl mb-4 text-center">Create Account</h2>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name (Optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Min 8 chars, uppercase, lowercase, number, special char
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        Create Account <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setStep("login"); setError(""); }}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {/* Email Verification Pending */}
            {step === "verify-email" && (
              <motion.div
                key="verify-email"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-semibold text-xl mb-2">Check Your Email</h2>
                <p className="text-muted-foreground mb-4">
                  We've sent a verification link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Click the link in the email to verify your account.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setStep("login"); setSuccess(""); }}
                >
                  Back to Login
                </Button>
              </motion.div>
            )}

            {/* MFA Verification */}
            {step === "mfa" && (
              <motion.div
                key="mfa"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-semibold text-xl mb-2 text-center">Two-Factor Authentication</h2>
                <p className="text-center text-muted-foreground mb-6">
                  Enter the 6-digit code sent to your email
                </p>
                
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                
                {/* OTP Input */}
                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono font-bold rounded-lg border border-border bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      disabled={loading}
                      aria-label={`OTP digit ${index + 1}`}
                      placeholder="0"
                    />
                  ))}
                </div>
                
                {/* Countdown */}
                {countdown > 0 && (
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    Code expires in <span className="font-mono text-primary">{formatCountdown(countdown)}</span>
                  </p>
                )}
                
                <Button
                  className="w-full"
                  onClick={handleMFAVerify}
                  disabled={loading || otp.some(d => !d)}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={() => { setStep("login"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to Login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to UptimeAI's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
