import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LogOut, Activity, Search, Printer, MessageSquarePlus,
  BarChart3, AlertTriangle, Droplets, Loader2, MapPin, Tent
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface HealthReport {
  id: string;
  village_name: string;
  report_date: string;
  fever_cases: number;
  diarrhea_cases: number;
  vomiting_cases: number;
  water_ph: number;
  water_turbidity: number;
  alert_level: string;
  alert_message: string;
  user_id: string;
  submitter_name?: string;
  latitude?: number;
  longitude?: number;
  location_timestamp?: string;
  symptoms?: string[];
  people_affected?: number;
  predicted_disease?: string;
  disease_risk_level?: string;
  disease_advice?: string;
  possible_organism?: string;
  medical_camp_arranged?: boolean;
  health_advice?: string;
  created_at?: string;
  profiles?: { full_name: string } | null;
}

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // States for actions
  const [adviceDialogOpen, setAdviceDialogOpen] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [adviceText, setAdviceText] = useState("");
  const [sendingAdvice, setSendingAdvice] = useState(false);

  // Chart Data
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [villageCases, setVillageCases] = useState<any[]>([]);

  const [doctorName, setDoctorName] = useState("Dr. Health Worker");

  const [sustainabilityData, setSustainabilityData] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
    fetchDoctorName();
  }, []);

  const fetchDoctorName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (data?.full_name) {
        setDoctorName(data.full_name.startsWith('Dr.') ? data.full_name : `Dr. ${data.full_name}`);
      }
    }
  };

  const fetchReports = async () => {
    // Step 1: Fetch reports first without the join
    const { data: reportsData, error: reportsError } = await supabase
      .from("health_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsError) {
      toast({ title: "Error", description: reportsError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (reportsData) {
      // Step 2: Extract user IDs and fetch profiles manually
      const userIds = Array.from(new Set(reportsData.map((r: any) => r.user_id).filter(Boolean)));

      let profilesMap: Record<string, { full_name: string }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.id] = { full_name: p.full_name };
          });
        }
      }

      // Merge data
      const combinedData = reportsData.map((r: any) => ({
        ...r,
        profiles: profilesMap[r.user_id] || null
      }));

      setReports(combinedData as unknown as HealthReport[]);
      processChartData(combinedData as unknown as HealthReport[]);
    }
    setLoading(false);
  };

  const processChartData = (data: HealthReport[]) => {
    // 1. Timeline Data (Sort by date ascending)
    const sortedData = [...data].sort((a, b) =>
      new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
    );
    const timeline = sortedData.map(r => ({
      date: new Date(r.created_at || "").toLocaleDateString(),
      ph: r.water_ph,
      turbidity: r.water_turbidity
    }));
    setTimelineData(timeline);

    // 2. Risk Distribution
    const risks = { High: 0, Moderate: 0, Safe: 0 };
    data.forEach(r => {
      const level = (r.disease_risk_level || r.alert_level || "Safe").toLowerCase();
      if (level.includes("high") || level.includes("severe")) risks.High++;
      else if (level.includes("moderate")) risks.Moderate++;
      else risks.Safe++;
    });

    // Calculate Percentages for Pie Chart
    const total = data.length || 1;
    setRiskData([
      { name: "Safe", value: Math.round((risks.Safe / total) * 100), count: risks.Safe, color: "#10b981" },
      { name: "Moderate", value: Math.round((risks.Moderate / total) * 100), count: risks.Moderate, color: "#f59e0b" },
      { name: "High Risk", value: Math.round((risks.High / total) * 100), count: risks.High, color: "#ef4444" },
    ].filter(d => d.value > 0));

    // 3. Cases per Village
    const vCases: Record<string, number> = {};
    data.forEach(r => {
      const count = r.people_affected || 1;
      vCases[r.village_name] = (vCases[r.village_name] || 0) + count;
    });
    setVillageCases(Object.entries(vCases).map(([name, count]) => ({ name, count })));

    // 4. Sustainability Score (Mock Data derived from real metrics)
    // We create a radar chart based on average health metrics across all reports
    const avgPh = data.reduce((acc, r) => acc + (r.water_ph || 0), 0) / (data.length || 1);
    const avgSafety = (risks.Safe / total) * 100;
    const responseRate = 85; // Mock: percentage of reports addressed
    const accessibility = 70; // Mock: coverage score

    setSustainabilityData([
      { subject: 'Water Potability', A: Math.min(100, (avgPh >= 6.5 && avgPh <= 8.5) ? 90 : 60), fullMark: 100 },
      { subject: 'Disease Control', A: Math.min(100, 100 - (risks.High / total) * 100), fullMark: 100 },
      { subject: 'Report Safety', A: avgSafety, fullMark: 100 },
      { subject: 'Response Rate', A: responseRate, fullMark: 100 },
      { subject: 'Data Coverage', A: accessibility, fullMark: 100 },
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };



  const [printingReportId, setPrintingReportId] = useState<string | null>(null);

  const handlePrint = (reportId: string) => {
    setPrintingReportId(reportId);
    setTimeout(() => {
      window.print();
      setPrintingReportId(null);
    }, 100);
  };

  const openAdviceDialog = (reportId: string, currentAdvice: string = "") => {
    setCurrentReportId(reportId);
    // Ignore the default system message so the input box is clean for the doctor
    if (currentAdvice === "No specific microorganisms detected based on current data.") {
      setAdviceText("");
    } else {
      setAdviceText(currentAdvice || "");
    }
    setAdviceDialogOpen(true);
  };

  const submitAdvice = async () => {
    if (!currentReportId) return;
    setSendingAdvice(true);

    const { error } = await supabase
      .from("health_reports")
      .update({ health_advice: adviceText })
      .eq("id", currentReportId);

    setSendingAdvice(false);

    if (error) {
      toast({ title: "Error", description: "Failed to send advice", variant: "destructive" });
    } else {
      toast({ title: "Advice Sent", description: "The villager will receive your advice." });
      setAdviceDialogOpen(false);
      fetchReports(); // Refresh to show new advice locally if needed
    }
  };

  const arrangeMedicalCamp = async (reportId: string) => {
    const { error } = await supabase
      .from("health_reports")
      .update({ alert_message: "MEDICAL_CAMP_ARRANGED" })
      .eq("id", reportId);

    if (error) {
      console.error("Error arranging medical camp:", error);
      toast({ title: "Error", description: "Failed to arrange medical camp", variant: "destructive" });
    } else {
      toast({
        title: "Medical Camp Arranged",
        description: "Action recorded. Villagers will be notified.",
        className: "bg-green-50 border-green-200 text-green-800"
      });
      fetchReports();
    }
  };

  const filteredReports = reports.filter(r =>
    r.village_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalReports: reports.length,
    highRisk: reports.filter(r => (r.disease_risk_level || "").toLowerCase().includes("high")).length,
    avgPh: (reports.reduce((acc, r) => acc + (r.water_ph || 0), 0) / (reports.length || 1)).toFixed(1)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 pb-20 font-sans text-slate-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-30 shadow-sm transition-all duration-300 print:hidden">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-serif font-normal text-slate-800 flex items-center gap-3 tracking-wide">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-300">
              <Activity className="h-7 w-7" />
            </div>
            Health Worker Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-slate-700 hidden sm:inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-slate-200 shadow-sm h-14">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-green-500/50 shadow-sm"></div>
              {doctorName}
            </span>
            <Button variant="ghost" size="lg" onClick={handleLogout} className="text-slate-600 hover:text-white hover:bg-red-500 font-bold transition-all rounded-xl px-8 h-14 text-lg border-2 border-slate-100 hover:border-red-500">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl print:p-0 print:max-w-none">

        {/* Top Stats Cards - Hidden on Print */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-100 uppercase tracking-wider">Total Reports</p>
                <h3 className="text-4xl font-extrabold mt-1">{stats.totalReports}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-red-100 uppercase tracking-wider">High Risk Alerts</p>
                <h3 className="text-4xl font-extrabold mt-1">{stats.highRisk}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-teal-500/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-100 uppercase tracking-wider">Villages Monitored</p>
                <h3 className="text-4xl font-extrabold mt-1">{villageCases.length}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Droplets className="h-8 w-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Hidden on print unless needed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:hidden">
          {/* Water Quality Timeline */}
          <Card className="bg-white border-slate-200 shadow-sm col-span-1 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-slate-800">Water Quality Timeline</CardTitle>
              <p className="text-base text-slate-500">pH and Turbidity levels over time</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" fontSize={14} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis fontSize={14} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '14px' }} />
                    <Line type="monotone" dataKey="ph" name="pH Level" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="turbidity" name="Turbidity (NTU)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-slate-800">Risk Distribution</CardTitle>
              <p className="text-base text-slate-500">Percentage of villages by risk level</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* New Radar Chart: Sustainability Score */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-slate-800">Health Impact Score</CardTitle>
              <p className="text-base text-slate-500">Overall performance metrics</p>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sustainabilityData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                    />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cases by Village */}
          <Card className="bg-white border-slate-200 shadow-sm col-span-1 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-slate-800">Top Affected Locations</CardTitle>
              <p className="text-base text-slate-500">Locations with highest reported cases (Top 10)</p>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] w-full pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={villageCases.sort((a, b) => b.count - a.count).slice(0, 10)} margin={{ bottom: 30, top: 10 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      fontSize={13}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      interval={0}
                      // angle={-45}
                      // textAnchor="end"
                      height={50}
                    />
                    <YAxis fontSize={14} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                    />
                    <Bar dataKey="count" name="Total Cases" fill="url(#colorCount)" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        <div className="flex items-center justify-between mb-6 pt-4 border-t border-slate-200 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">All User Reports</h2>
            <p className="text-slate-500">Detailed health data and risk analysis</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search user..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-6">
          {filteredReports.map((report) => {
            const riskLevel = (report.disease_risk_level || report.alert_level || "Safe").toLowerCase();
            const isHigh = riskLevel.includes("high") || riskLevel.includes("severe");
            const isModerate = riskLevel.includes("moderate");

            return (
              <Card key={report.id} className={`
                border-0 shadow-lg backdrop-blur-md overflow-hidden relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                ${isHigh
                  ? "bg-gradient-to-br from-white via-red-50/30 to-red-50/80 ring-1 ring-red-100/50"
                  : isModerate
                    ? "bg-gradient-to-br from-white via-orange-50/30 to-orange-50/80 ring-1 ring-orange-100/50"
                    : "bg-gradient-to-br from-white via-emerald-50/30 to-emerald-50/80 ring-1 ring-emerald-100/50"}
                ${printingReportId && printingReportId === report.id ? 'print:block print:absolute print:top-0 print:left-0 print:w-full print:min-h-screen print:z-[100] print:m-0 print:bg-white' : ''}
                ${printingReportId && printingReportId !== report.id ? 'print:hidden' : ''}
              `}>

                {/* Colored Side Bar Accent */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                ${isHigh ? "bg-red-500" : isModerate ? "bg-orange-500" : "bg-emerald-500"}`}
                />

                <div className="p-6 pl-8">
                  <div className="flex flex-col xl:flex-row gap-6">

                    {/* Left Column: Village Info & Submitter */}
                    <div className="w-full xl:w-1/4 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1">{report.village_name}</h3>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                          Let's keep track of {report.village_name}
                        </p>
                        {report.latitude && report.longitude && (
                          <div className="mt-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              View Live Location
                            </a>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">
                              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {(report.profiles?.full_name || report.submitter_name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Reported By</p>
                          <p className="font-semibold text-slate-700 text-sm">{report.profiles?.full_name || report.submitter_name || "Unknown User"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Date</span>
                          <span className="font-mono">{new Date(report.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <Badge variant="outline" className={`
                                  py-1.5 justify-center font-bold tracking-wide rounded-lg
                                  ${isHigh ? "bg-red-100 text-red-700 border-red-200" : isModerate ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}
                               `}>
                          {report.disease_risk_level || report.alert_level || "Safe Condition"}
                        </Badge>
                      </div>
                    </div>

                    {/* Middle Column: Detailed Health & Water Metrics */}
                    <div className="w-full xl:w-2/4 xl:border-l xl:border-r border-slate-200/60 xl:px-8 space-y-5">

                      {/* Disease Prediction Section */}
                      <div className="bg-white/50 rounded-xl p-4 border border-white/60 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Disease Prediction
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-slate-800">{report.predicted_disease || "Analysis Pending"}</p>
                        </div>
                      </div>

                      {/* Symptoms */}
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reported Symptoms ({report.people_affected || 1} cases)</p>
                        <div className="flex flex-wrap gap-2">
                          {report.symptoms && report.symptoms.length > 0 ? report.symptoms.map(s => (
                            <span key={s} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 shadow-sm">
                              {s.replace(/_/g, " ")}
                            </span>
                          )) : <span className="text-sm text-slate-400 italic">No specific symptoms recorded</span>}
                        </div>
                      </div>

                      {/* Water Quality Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center group-hover:bg-blue-50 transition-colors">
                          <div className="text-xs text-blue-400 font-bold uppercase mb-1">pH Level</div>
                          <div className="text-3xl font-black text-blue-600 tracking-tight">{report.water_ph}</div>
                          <div className={`h-1 w-12 rounded-full mt-2 ${report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-xs font-bold mt-1 ${report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'text-green-600' : 'text-red-500'}`}>
                            {report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'Safe' : (report.water_ph < 6.5 ? 'Acidic' : 'Alkaline')}
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center group-hover:bg-emerald-50 transition-colors">
                          <div className="text-xs text-emerald-500 font-bold uppercase mb-1">Turbidity</div>
                          <div className="text-3xl font-black text-emerald-600 tracking-tight flex items-end gap-1">
                            {report.water_turbidity}
                            <span className="text-sm font-bold text-emerald-400 mb-1">NTU</span>
                          </div>
                          <div className={`h-1 w-12 rounded-full mt-2 ${report.water_turbidity < 5 ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                          <span className={`text-xs font-bold mt-1 ${report.water_turbidity < 5 ? 'text-green-600' : 'text-orange-500'}`}>
                            {report.water_turbidity < 1 ? 'Clear' : (report.water_turbidity < 5 ? 'Moderate' : 'High')}
                          </span>
                        </div>
                      </div>

                      {/* Possible Organism Warning */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="p-1.5 bg-red-100 rounded-full text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <span className="block text-xs font-bold text-red-400 uppercase">Microbial Risk</span>
                          <span className="font-semibold text-red-700">{report.possible_organism || "Low Risk / None Detected"}</span>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Advice & Actions */}
                    <div className="w-full xl:w-1/4 flex flex-col gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Display Worker Advice */}
                        {report.health_advice ? (
                          <div className="bg-amber-100/50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                              <MessageSquarePlus className="h-16 w-16" />
                            </div>
                            <p className="text-xs font-bold text-amber-600 uppercase mb-2">Sent Advice</p>
                            <p className="relative z-10 font-medium leading-relaxed">"{report.health_advice}"</p>
                          </div>
                        ) : (
                          <div className="h-full min-h-[100px] flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-sm">
                            No advice sent yet
                          </div>
                        )}

                        {/* AI Advice Summary */}
                        {!report.health_advice && report.disease_advice && (
                          <div className="text-xs text-slate-500 bg-white/50 p-3 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-600">AI Suggestion:</span> {report.disease_advice.substring(0, 100)}...
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2 print:hidden">
                        <Button
                          onClick={() => openAdviceDialog(report.id, report.health_advice)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 rounded-xl py-6 font-bold tracking-wide transition-all active:scale-95"
                        >
                          <MessageSquarePlus className="h-5 w-5 mr-2" /> {report.health_advice ? "Update Advice" : "Send Advice"}
                        </Button>


                        <Button
                          onClick={() => arrangeMedicalCamp(report.id)}
                          disabled={report.alert_message === "MEDICAL_CAMP_ARRANGED" || report.medical_camp_arranged}
                          className={`w-full py-6 font-bold tracking-wide transition-all active:scale-95 shadow-lg
                            ${(report.alert_message === "MEDICAL_CAMP_ARRANGED" || report.medical_camp_arranged)
                              ? "bg-green-100 text-green-700 border border-green-200 shadow-none cursor-not-allowed opacity-100"
                              : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/30"
                            }
                          `}
                        >
                          {(report.alert_message === "MEDICAL_CAMP_ARRANGED" || report.medical_camp_arranged) ? (
                            <>
                              <Tent className="h-5 w-5 mr-2" /> Medical Camp Arranged
                            </>
                          ) : (
                            <>
                              <Tent className="h-5 w-5 mr-2" /> Arrange Medical Camp
                            </>
                          )}
                        </Button>

                        <Button variant="outline" onClick={() => handlePrint(report.id)} className="w-full border-slate-300 text-slate-600 hover:bg-slate-50 rounded-xl py-6 font-semibold">
                          <Printer className="h-4 w-4 mr-2" /> Print Report
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Advice Dialog */}
        <Dialog open={adviceDialogOpen} onOpenChange={setAdviceDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Health Advice</DialogTitle>
              <DialogDescription>
                Provide medical advice or instructions for the villagers based on this report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="advice">Advice Message</Label>
                <Textarea
                  id="advice"
                  placeholder="Enter your advice here..."
                  value={adviceText}
                  onChange={(e) => setAdviceText(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdviceDialogOpen(false)}>Cancel</Button>
              <Button onClick={submitAdvice} disabled={sendingAdvice} className="bg-blue-600">
                {sendingAdvice ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Advice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default WorkerDashboard;
