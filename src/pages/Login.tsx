import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { useFeedback } from "@/hooks/use-feedback";

const Login = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        showSuccess("Signed in", "Signed in successfully.");
      } else {
        await signUp(email, password);
        showSuccess("Check your email", "Check your email to confirm your account.");
      }
    } catch (err: any) {
      showError("Authentication failed", err.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 font-body">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/iska systems logos.png" alt="Iska Service OS" className="mx-auto h-10" />
          <p className="mt-2 text-xs text-hero-muted">Admin Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-card p-6 shadow-2xl">
          <h2 className="font-display text-base font-bold text-card-foreground">{isLogin ? "Sign In" : "Sign Up"}</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 sm:text-sm"
          >
            {submitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
