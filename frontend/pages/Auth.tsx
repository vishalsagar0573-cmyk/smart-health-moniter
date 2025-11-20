import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [workerLogin, setWorkerLogin] = useState({ email: "", password: "" });
  const [workerRegister, setWorkerRegister] = useState({ name: "", email: "", password: "" });
  const [villagerLogin, setVillagerLogin] = useState({ email: "", password: "" });
  const [villagerRegister, setVillagerRegister] = useState({ name: "", email: "", password: "" });

  const handleLogin = async (email: string, password: string, intendedRole?: "health_worker" | "villager") => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);

      if (error) {
        console.error("Login error:", error);
        setError(error.message);
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        const roleList = (roles || []).map((r: any) => r.role);

        // If a specific role was intended via the clicked button, enforce it strictly
        if (intendedRole) {
          if (roleList.includes(intendedRole)) {
            localStorage.setItem("lastRole", intendedRole);
            navigate(intendedRole === "health_worker" ? "/worker-dashboard" : "/villager-dashboard");
            return;
          } else {
            // Logout immediately and show error if the account doesn't have that role
            await supabase.auth.signOut();
            toast({
              title: "Wrong login type",
              description: intendedRole === "health_worker"
                ? "This account is not registered as a Health Worker. Please use the Villager login."
                : "This account is not registered as a Villager. Please use the Health Worker login.",
              variant: "destructive",
            });
            return;
          }
        }

        // No specific intent: route by available roles (prefer villager when ambiguous)
        if (roleList.includes("villager")) {
          localStorage.setItem("lastRole", "villager");
          navigate("/villager-dashboard");
        } else if (roleList.includes("health_worker")) {
          localStorage.setItem("lastRole", "health_worker");
          navigate("/worker-dashboard");
        } else {
          // No role found; sign out and prompt user
          await supabase.auth.signOut();
          toast({
            title: "No role assigned",
            description: "Your account has no assigned role. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      setLoading(false);
      console.error("Unexpected error during login:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (name: string, email: string, password: string, role: "health_worker" | "villager") => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name,
            role,
          },
        },
      });

      if (error) {
        setLoading(false);
        console.error("Registration error:", error);
        setError(error.message);
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setLoading(false);

      toast({
        title: "Registration successful!",
        description: "You can now log in with your credentials.",
      });

      // Auto login after registration
      await handleLogin(email, password, role);
    } catch (err) {
      setLoading(false);
      console.error("Unexpected error during registration:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background via-secondary/5 to-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <Card className="w-full max-w-4xl shadow-medical-lg border-primary/20 bg-card/95 backdrop-blur-sm relative z-10 animate-fade-in">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl shadow-medical animate-float">
              <Stethoscope className="h-14 w-14 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold gradient-medical-text mb-3">
            Smart Community Health Monitoring
          </CardTitle>
          <CardDescription className="text-base md:text-lg">
            Early Warning System for Water-Borne Diseases
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {error && (
            <Alert variant="destructive" className="mb-6 animate-slide-in border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="worker" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-muted/50">
              <TabsTrigger value="worker" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Stethoscope className="h-4 w-4" />
                <span className="font-medium">Health Worker</span>
              </TabsTrigger>
              <TabsTrigger value="villager" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-all">
                <Users className="h-4 w-4" />
                <span className="font-medium">Village People</span>
              </TabsTrigger>
            </TabsList>

            {/* Health Worker Auth */}
            <TabsContent value="worker">
              <Tabs defaultValue="worker-login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="worker-login">Login</TabsTrigger>
                  <TabsTrigger value="worker-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="worker-login" className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="worker-login-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="worker-login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="worker@health.gov"
                      value={workerLogin.email}
                      onChange={(e) => setWorkerLogin({ ...workerLogin, email: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-login-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="worker-login-password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={workerLogin.password}
                      onChange={(e) => setWorkerLogin({ ...workerLogin, password: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all duration-300 btn-glow"
                    onClick={() => handleLogin(workerLogin.email, workerLogin.password, "health_worker")}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Logging in...
                      </span>
                    ) : (
                      "Login as Health Worker"
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="worker-register" className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="worker-register-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="worker-register-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="Dr. John Doe"
                      value={workerRegister.name}
                      onChange={(e) => setWorkerRegister({ ...workerRegister, name: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-register-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="worker-register-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="worker@health.gov"
                      value={workerRegister.email}
                      onChange={(e) => setWorkerRegister({ ...workerRegister, email: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-register-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="worker-register-password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={workerRegister.password}
                      onChange={(e) => setWorkerRegister({ ...workerRegister, password: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all duration-300 btn-glow"
                    onClick={() =>
                      handleRegister(
                        workerRegister.name,
                        workerRegister.email,
                        workerRegister.password,
                        "health_worker"
                      )
                    }
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Registering...
                      </span>
                    ) : (
                      "Register as Health Worker"
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Villager Auth */}
            <TabsContent value="villager">
              <Tabs defaultValue="villager-login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="villager-login">Login</TabsTrigger>
                  <TabsTrigger value="villager-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="villager-login" className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="villager-login-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="villager-login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="villager@example.com"
                      value={villagerLogin.email}
                      onChange={(e) => setVillagerLogin({ ...villagerLogin, email: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-secondary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="villager-login-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="villager-login-password"
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={villagerLogin.password}
                      onChange={(e) => setVillagerLogin({ ...villagerLogin, password: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-secondary/50 transition-all"
                      required
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-base font-medium bg-secondary hover:bg-secondary/90 shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => handleLogin(villagerLogin.email, villagerLogin.password, "villager")}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Logging in...
                      </span>
                    ) : (
                      "Login as Villager"
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="villager-register" className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="villager-register-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="villager-register-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      placeholder="Your Name"
                      value={villagerRegister.name}
                      onChange={(e) => setVillagerRegister({ ...villagerRegister, name: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-secondary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="villager-register-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="villager-register-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="villager@example.com"
                      value={villagerRegister.email}
                      onChange={(e) => setVillagerRegister({ ...villagerRegister, email: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-secondary/50 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="villager-register-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="villager-register-password"
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      placeholder="Minimum 6 characters"
                      value={villagerRegister.password}
                      onChange={(e) => setVillagerRegister({ ...villagerRegister, password: e.target.value })}
                      className="h-11 focus:ring-2 focus:ring-secondary/50 transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button
                    className="w-full h-11 text-base font-medium bg-secondary hover:bg-secondary/90 shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() =>
                      handleRegister(
                        villagerRegister.name,
                        villagerRegister.email,
                        villagerRegister.password,
                        "villager"
                      )
                    }
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Registering...
                      </span>
                    ) : (
                      "Register as Villager"
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          <div className="mt-8 p-5 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
            <p className="text-sm text-center text-muted-foreground space-y-1">
              <span className="block"><strong className="text-primary">Health Workers:</strong> Monitor village health data and outbreak alerts</span>
              <span className="block"><strong className="text-secondary">Villagers:</strong> Report health symptoms and water quality data</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
