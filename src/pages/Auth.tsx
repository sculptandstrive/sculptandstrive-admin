import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Dumbbell, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  if (user) {
    return null;
  }

  const handleForgotPassword = async () => {
    const trimmedEmail = loginEmail.trim();
    if (!trimmedEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email in the field above to receive a reset link.",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(trimmedEmail);
    } catch {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Reset Request Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset Link Sent",
          description: `A password reset link has been sent to ${trimmedEmail}. Please check your inbox.`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send reset link.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      let message = "An error occurred during login";
      if (error.message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.message.includes("Email not confirmed")) {
        message = "Please confirm your email address before logging in.";
      } else {
        message = error.message;
      }
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in to the Admin Portal.",
      });
      navigate(from, { replace: true });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF7F5] via-[#F3F9F7] to-[#F7FAFA] flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Ambient Glow Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7BE3C6]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0CA681]/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[430px] z-10"
      >
        {/* Top Logo and Title Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-[22px] bg-white p-2.5 flex items-center justify-center shadow-[6px_6px_16px_rgba(130,155,151,0.2),-4px_-4px_12px_rgba(255,255,255,0.95)] border border-white/90 mb-3.5">
            <img src={logo} alt="Sculpt & Strive Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#10203B] tracking-tight">
            Sculpt And Strive
          </h1>
          <p className="text-xs sm:text-[13px] text-[#6F849A] font-medium mt-0.5">
            Administrative Access Portal
          </p>
        </div>

        {/* 3D Neumorphic Card */}
        <div className="bg-white rounded-[24px] sm:rounded-[28px] p-6 sm:p-7 border border-white/95 shadow-[8px_8px_24px_rgba(130,155,151,0.16),-6px_-6px_20px_rgba(255,255,255,0.95)]">
          {/* Card Header Row */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#0F1C32] tracking-tight leading-tight">
                Admin Sign In
              </h2>
              <p className="text-xs sm:text-[13px] text-[#71849B] font-medium mt-0.5">
                Sign in with authorized credentials
              </p>
            </div>

            {/* Admin Badge */}
            <div className="bg-[#DDF5EE] border border-[#BCE8D8] rounded-[14px] px-2.5 py-1.5 flex items-center gap-1.5 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8)] shrink-0">
              <div className="w-5 h-5 rounded-[6px] bg-[#CEEFE6] flex items-center justify-center text-[#07AC7D]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#07AC7D]" />
              </div>
              <span className="text-[11px] font-bold text-[#07AC7D] leading-tight whitespace-nowrap">
                Admin<br />Control
              </span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field with Non-overlapping Inset Well */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold text-[#536B83]">
                Email Address
              </Label>
              <div className="relative rounded-[14px] bg-[#F5FAF9] border border-white/90 shadow-[inset_2px_2px_5px_rgba(130,155,151,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] flex items-center px-3 h-11 focus-within:ring-2 focus-within:ring-[#0CA681]/40 transition-all">
                <div className="w-7 h-7 rounded-[8px] bg-[#EAF2F0] flex items-center justify-center text-[#526B85] shrink-0 mr-2.5 shadow-[1px_1px_2px_rgba(130,155,151,0.1)]">
                  <Mail className="w-4 h-4 text-[#526B85]" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@sculptandstrive.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-[#0F1C32] placeholder:text-[#94A3B8] focus:outline-none w-full"
                  required
                />
              </div>
            </div>

            {/* Password Field with Non-overlapping Inset Well & Eye Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold text-[#536B83]">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-semibold text-[#07AC7D] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resetLoading ? "Sending Link..." : "Forgot Password?"}
                </button>
              </div>
              <div className="relative rounded-[14px] bg-[#F5FAF9] border border-white/90 shadow-[inset_2px_2px_5px_rgba(130,155,151,0.12),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] flex items-center px-3 h-11 focus-within:ring-2 focus-within:ring-[#0CA681]/40 transition-all">
                <div className="w-7 h-7 rounded-[8px] bg-[#EAF2F0] flex items-center justify-center text-[#526B85] shrink-0 mr-2.5 shadow-[1px_1px_2px_rgba(130,155,151,0.1)]">
                  <Lock className="w-4 h-4 text-[#526B85]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-[#0F1C32] placeholder:text-[#94A3B8] focus:outline-none w-full pr-8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F1C32] transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 sm:h-12 rounded-[14px] bg-[#0CA681] hover:bg-[#099271] text-white font-bold text-sm sm:text-[15px] shadow-[4px_4px_12px_rgba(12,166,129,0.25),-2px_-2px_6px_rgba(255,255,255,0.8)] active:shadow-[inset_2px_2px_4px_rgba(0,80,60,0.25)] flex items-center justify-center relative px-4 transition-all duration-200 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <div className="w-7 h-7 rounded-full bg-[#12B890] flex items-center justify-center text-white absolute right-2.5 shadow-[1px_1px_3px_rgba(0,0,0,0.12)]">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs font-semibold text-[#6F849A] mt-5 flex items-center justify-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-[#08A982]" />
          Sculpt And Strive • Official Platform Command
        </p>
      </motion.div>
    </div>
  );
}
