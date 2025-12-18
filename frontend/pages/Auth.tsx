import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Users, Activity, ShieldCheck, HeartPulse, Droplets, Globe } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translations, Language } from "@/utils/translations";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'en');
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'te', label: 'తెలుగు' }
  ];

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (role: "health_worker" | "villager") => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        localStorage.setItem("lastRole", role);
        navigate(role === "health_worker" ? "/worker-dashboard" : "/villager-dashboard");
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (role: "health_worker" | "villager") => {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { full_name: regName, role },
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created",
        description: "Please check your email or login now.",
      });

      // Auto-fill login
      setEmail(regEmail);
      setPassword(regPassword);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-400 opacity-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-400 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden mx-4 relative z-10 border border-white/50">

        {/* Left Side - Hero / Branding */}
        <div className="hidden md:flex flex-col justify-center p-12 bg-gradient-to-br from-blue-600 to-teal-600 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30">
                <Activity className="h-8 w-8 text-white" />
              </div>

              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2 bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 hover:text-white border-0">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline-block font-medium">
                      {languages.find(l => l.code === lang)?.label}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[150px]">
                  {languages.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      onClick={() => setLang(l.code as Language)}
                      className={`font-medium cursor-pointer ${lang === l.code ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                    >
                      {l.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight">{t.auth_branding_title}</h1>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              {t.auth_branding_desc}
            </p>

            <div className="flex gap-4">
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                <HeartPulse className="h-5 w-5 text-teal-200" />
                <span className="font-medium text-sm">{t.landing_feat_symptom_title}</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                <Droplets className="h-5 w-5 text-blue-200" />
                <span className="font-medium text-sm">{t.landing_feat_water_title}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white/50">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-800">{t.auth_welcome}</h2>
            <p className="text-slate-500">{t.auth_secure_access}</p>
          </div>

          <Tabs defaultValue="villager" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1.5 bg-slate-100 rounded-xl mb-8">
              <TabsTrigger
                value="villager"
                className="rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                onClick={() => setError("")}
              >
                <Users className="h-4 w-4 mr-2" />
                {t.auth_tab_villager}
              </TabsTrigger>
              <TabsTrigger
                value="worker"
                className="rounded-lg py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm transition-all"
                onClick={() => setError("")}
              >
                <Stethoscope className="h-4 w-4 mr-2" />
                {t.auth_tab_worker}
              </TabsTrigger>
            </TabsList>

            {/* Villager Tab */}
            <TabsContent value="villager" className="space-y-6 outline-none">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700 animate-in fade-in zoom-in-95">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="login" className="w-full">
                <div className="flex border-b border-slate-200 mb-6">
                  <TabsList className="bg-transparent p-0 h-auto">
                    <TabsTrigger value="login" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 bg-transparent text-slate-500 hover:text-slate-700 shadow-none">{t.auth_tab_login}</TabsTrigger>
                    <TabsTrigger value="register" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 bg-transparent text-slate-500 hover:text-slate-700 shadow-none">{t.auth_tab_register}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="login" className="space-y-5 animate-in slide-in-from-right-2">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.auth_email_label}</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.auth_password_label}</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <Button
                    onClick={() => handleLogin('villager')}
                    disabled={loading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 mt-2 transition-all"
                  >
                    {loading ? "Signing in..." : t.auth_login_btn}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-5 animate-in slide-in-from-right-2">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.auth_name_label}</Label>
                    <Input value={regName} onChange={(e) => setRegName(e.target.value)} className="h-11 bg-slate-50 border-slate-200 focus:bg-white" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.auth_email_label}</Label>
                    <Input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="h-11 bg-slate-50 border-slate-200 focus:bg-white" placeholder="name@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.auth_password_label}</Label>
                    <Input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type="password" className="h-11 bg-slate-50 border-slate-200 focus:bg-white" />
                  </div>
                  <Button onClick={() => handleRegister('villager')} disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 mt-2">
                    {t.auth_register_btn}
                  </Button>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Health Worker Tab */}
            <TabsContent value="worker" className="space-y-6 outline-none">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-teal-900 text-sm">Restricted Access</h4>
                  <p className="text-teal-700 text-sm">Please use your official credentials to access the health worker portal.</p>
                </div>
              </div>

              <div className="space-y-5 animate-in slide-in-from-right-2">
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">{t.auth_email_label}</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@health.gov"
                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">{t.auth_password_label}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-teal-500/20"
                  />
                </div>
                <Button
                  onClick={() => handleLogin('health_worker')}
                  disabled={loading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-lg shadow-teal-600/20 mt-2 transition-all"
                >
                  {loading ? "Verifying Credentials..." : t.auth_login_btn}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
