import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/galaxy-logo.png.asset.json";
import { createFirstSuperAdmin, needsBootstrap } from "@/lib/bootstrap.functions";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export function AuthScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkBootstrap = useServerFn(needsBootstrap);
  const bootstrapFn = useServerFn(createFirstSuperAdmin);
  const bootstrap = useQuery({ queryKey: ["needs-bootstrap"], queryFn: () => checkBootstrap() });
  const setupMode = bootstrap.data?.needed === true;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    if (setupMode) {
      if (fullName.trim().length < 2) {
        setLoading(false);
        toast.error("Enter your full name");
        return;
      }
      if (password.length < 8) {
        setLoading(false);
        toast.error("Password must be at least 8 characters");
        return;
      }
      try {
        await bootstrapFn({ data: { full_name: fullName.trim(), email: parsed.data.email, password } });
      } catch (err) {
        setLoading(false);
        toast.error(err instanceof Error ? err.message : "Setup failed");
        return;
      }
      await bootstrap.refetch();
    }
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-brand-gradient p-12 lg:flex">
        <div className="rounded-xl bg-background/95 p-5 w-fit shadow-card">
          <img src={logo.url} alt="Galaxy Online Power Systems logo" className="h-16 w-auto" />
        </div>
        <div className="max-w-md text-primary-foreground">
          <h1 className="text-4xl font-bold leading-tight">Service Management Portal</h1>
          <p className="mt-4 text-base opacity-85">
            Tickets, installation and preventive maintenance reports, technician performance and PAN India
            analytics — in one place.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">
          Internal use only · Galaxy Online Power Systems
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm border-border/70 shadow-card">
          <CardContent className="pt-6">
            <img src={logo.url} alt="Galaxy logo" className="mb-6 h-12 w-auto lg:hidden" />
            <h2 className="text-2xl font-semibold">{setupMode ? "Create Super Admin" : "Sign in"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {setupMode
                ? "First-time setup — this account gets full control of the portal."
                : "Accounts are created by your Super Admin."}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {setupMode && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@galaxyups.in"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || checking}>
                {loading ? "Please wait…" : setupMode ? "Create account & sign in" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}