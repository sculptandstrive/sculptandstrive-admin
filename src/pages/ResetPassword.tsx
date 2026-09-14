import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        setCheckingToken(true);
        setErrorMessage(null);

        // 1. Check for error in URL query or hash fragment
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const errorDesc =
          searchParams.get("error_description") ||
          hashParams.get("error_description");
        const errorCode =
          searchParams.get("error_code") || hashParams.get("error_code");

        if (errorDesc || errorCode) {
          setErrorMessage(
            errorDesc?.replace(/\+/g, " ") ||
              "The password reset link is invalid or has expired. Please request a new link."
          );
          setCheckingToken(false);
          return;
        }

        // 2. Check for PKCE auth code
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setErrorMessage(
              exchangeError.message ||
                "Failed to verify password reset code. Please request a new link."
            );
            setCheckingToken(false);
            return;
          }
        }

        // 3. Verify session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setHasValidSession(true);
        } else {
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" || session) {
              setHasValidSession(true);
              setErrorMessage(null);
            }
          });

          setTimeout(async () => {
            const {
              data: { session: currentSession },
            } = await supabase.auth.getSession();
            if (currentSession) {
              setHasValidSession(true);
            } else if (!hasValidSession) {
              if (!hash.includes("access_token") && !code) {
                setErrorMessage(
                  "No active password reset session found. Please request a reset link from the login page."
                );
              }
            }
            setCheckingToken(false);
          }, 800);

          return () => {
            subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Failed to validate reset link. Please try again."
        );
      } finally {
        setCheckingToken(false);
      }
    };

    handleAuthRedirect();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        toast({
          title: "Reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Updated Successfully",
          description: "Your password has been changed. Please sign in with your new password.",
        });

        await supabase.auth.signOut();
        navigate("/auth");
      }
    } catch (err: any) {
      toast({
        title: "Unexpected Error",
        description: err?.message || "An error occurred while updating your password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto mb-2 rounded-2xl overflow-hidden flex items-center justify-center bg-primary/10 border border-primary/20">
            <img
              src={logo}
              alt="Sculpt and Strive Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Set New Password
          </h2>
          <p className="text-xs text-muted-foreground">
            Enter and confirm your new account password below.
          </p>
        </div>

        {checkingToken ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">
              Verifying reset credentials...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Link Expired or Invalid</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <Button
              onClick={() => navigate("/auth")}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10 h-10 rounded-xl border-input bg-card text-foreground text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="pl-10 pr-10 h-10 rounded-xl border-input bg-card text-foreground text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-[11px] space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    password.length >= 6 ? "text-primary" : "text-muted-foreground/40"
                  }`}
                />
                <span className={password.length >= 6 ? "text-foreground font-medium" : ""}>
                  Minimum 6 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    confirmPassword && password === confirmPassword
                      ? "text-primary"
                      : "text-muted-foreground/40"
                  }`}
                />
                <span
                  className={
                    confirmPassword && password === confirmPassword
                      ? "text-foreground font-medium"
                      : ""
                  }
                >
                  Passwords match
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs shadow-sm transition-colors mt-2"
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default ResetPassword;
