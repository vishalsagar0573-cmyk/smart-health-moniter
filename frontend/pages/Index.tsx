import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Droplets, Shield, ArrowRight, CheckCircle2, HeartPulse, Microscope, LineChart, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translations, Language } from "@/utils/translations";

const Index = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-400 opacity-5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="container mx-auto px-6 h-24 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-teal-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Activity className="h-8 w-8" />
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">
              HealthMonitor
            </span>
          </div>
          <div className="flex gap-4 items-center">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white hover:text-blue-600">
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

            <Button variant="ghost" className="text-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => navigate("/auth")}>{t.landing_login}</Button>
            <Button
              onClick={() => navigate("/auth")}
              className="h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all rounded-full px-8"
            >
              {t.landing_get_started}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-36 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-base font-medium mb-10 animate-in fade-in slide-in-from-bottom-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              {t.landing_hero_badge}
            </div>

            <h1 className="text-6xl md:text-8xl font-bold text-slate-900 leading-[1.1] mb-10 tracking-tight animate-in fade-in slide-in-from-bottom-6 delay-100">
              {t.landing_hero_title} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">{t.landing_hero_span}</span>
            </h1>

            <p className="text-2xl text-slate-600 mb-12 leading-relaxed max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 delay-200">
              {t.landing_hero_desc}
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-in fade-in slide-in-from-bottom-10 delay-300">
              <Button
                size="lg"
                className="h-16 px-10 text-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-600/20 transition-transform hover:scale-105"
                onClick={() => navigate("/auth")}
              >
                {t.landing_access_portal} <ArrowRight className="ml-3 h-6 w-6" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 px-10 text-xl bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full"
              >
                {t.landing_learn_more}
              </Button>
            </div>
          </div>
        </div>

        {/* Abstract Background Curve */}
        <div className="absolute top-1/2 left-0 w-full h-[600px] bg-slate-100/50 -skew-y-3 -z-10 translate-y-32" />
      </section>

      {/* Stats / Trust Banner */}
      <div className="bg-white border-y border-slate-100 py-16">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">98%</div>
              <div className="text-base text-slate-500 font-medium uppercase tracking-wide">{t.landing_stat_accuracy}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-teal-600 mb-2">24/7</div>
              <div className="text-base text-slate-500 font-medium uppercase tracking-wide">{t.landing_stat_monitoring}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-emerald-600 mb-2">50+</div>
              <div className="text-base text-slate-500 font-medium uppercase tracking-wide">{t.landing_stat_villages}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-indigo-600 mb-2">10k+</div>
              <div className="text-base text-slate-500 font-medium uppercase tracking-wide">{t.landing_stat_reports}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">{t.landing_feat_title}</h2>
            <p className="text-xl text-slate-600">{t.landing_feat_desc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 bg-white group overflow-hidden">
              <div className="h-3 w-full bg-gradient-to-r from-blue-500 to-blue-600" />
              <CardContent className="p-10">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform">
                  <Microscope className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{t.landing_feat_water_title}</h3>
                <p className="text-xl text-slate-600 leading-relaxed mb-8">
                  {t.landing_feat_water_desc}
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Instant pH Estimation
                  </li>
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Turbidity Detection
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-teal-200/50 transition-all duration-300 hover:-translate-y-1 bg-white group overflow-hidden">
              <div className="h-3 w-full bg-gradient-to-r from-teal-500 to-teal-600" />
              <CardContent className="p-10">
                <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center text-teal-600 mb-8 group-hover:scale-110 transition-transform">
                  <HeartPulse className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{t.landing_feat_symptom_title}</h3>
                <p className="text-xl text-slate-600 leading-relaxed mb-8">
                  {t.landing_feat_symptom_desc}
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Easy Visual Reporting
                  </li>
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Geographic Clustering
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-300 hover:-translate-y-1 bg-white group overflow-hidden">
              <div className="h-3 w-full bg-gradient-to-r from-orange-500 to-orange-600" />
              <CardContent className="p-10">
                <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 mb-8 group-hover:scale-110 transition-transform">
                  <LineChart className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{t.landing_feat_predict_title}</h3>
                <p className="text-xl text-slate-600 leading-relaxed mb-8">
                  {t.landing_feat_predict_desc}
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Real-time Risk Alerts
                  </li>
                  <li className="flex items-center gap-3 text-lg text-slate-500">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Resource Allocation
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-16 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 font-bold text-3xl text-slate-800 mb-8">
            <Activity className="h-8 w-8 text-blue-600" />
            <span>HealthMonitor</span>
          </div>
          <p className="text-xl text-slate-500 mb-8 max-w-xl mx-auto">
            {t.landing_footer_desc}
          </p>
          <div className="text-base text-slate-400">
            {t.landing_footer_rights}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
