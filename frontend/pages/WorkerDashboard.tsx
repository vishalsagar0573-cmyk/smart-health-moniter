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
  LogOut, Activity, Search, Printer, Trash2, MessageSquarePlus,
  BarChart3, AlertTriangle, Droplets, Loader2
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    const { error } = await supabase.from("health_reports").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete report" });
    } else {
      toast({ title: "Report Deleted", description: "The health report has been removed." });
      fetchReports(); // Refresh list
    }
  };

  const handlePrint = () => {
    window.print();
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

  const filteredReports = reports.filter(r =>
    r.village_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalReports: reports.length,
    highRisk: reports.filter(r => (r.disease_risk_level || "").toLowerCase().includes("high")).length,
    avgPh: (reports.reduce((acc, r) => acc + (r.water_ph || 0), 0) / (reports.length || 1)).toFixed(1)
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">Health Worker Dashboard</h1>
            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
              {doctorName}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
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
              <CardTitle className="text-lg font-bold text-slate-800">Water Quality Timeline</CardTitle>
              <p className="text-sm text-slate-500">pH and Turbidity levels over time</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="ph" name="pH Level" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="turbidity" name="Turbidity (NTU)" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800">Risk Distribution</CardTitle>
              <p className="text-sm text-slate-500">Percentage of villages by risk level</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* New Radar Chart: Sustainability Score */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-800">Health Impact Score</CardTitle>
              <p className="text-sm text-slate-500">Overall performance metrics</p>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sustainabilityData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#8b5cf6"
                      strokeWidth={2}
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
              <CardTitle className="text-lg font-bold text-slate-800">Top Affected Locations</CardTitle>
              <p className="text-sm text-slate-500">Locations with highest reported cases (Top 10)</p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full pb-4">
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
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      interval={0}
                      // angle={-45}
                      // textAnchor="end"
                      height={50}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                    />
                    <Bar dataKey="count" name="Total Cases" fill="url(#colorCount)" radius={[6, 6, 0, 0]} barSize={40} />
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

        <div className="space-y-4">
          {filteredReports.map((report) => (
            <Card key={report.id} className="bg-white border-slate-200 shadow-sm overflow-hidden break-inside-avoid print:shadow-none print:border">
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">

                  {/* Left Column: Village Info */}
                  <div className="w-full md:w-1/4 space-y-2">
                    <h3 className="font-bold text-xl text-slate-800">{report.village_name}</h3>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      📅 {new Date(report.created_at || Date.now()).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-1">
                      👤 {report.profiles?.full_name || report.submitter_name || "Unknown"}
                    </div>
                    <div className="pt-2">
                      <Badge variant="outline" className={`
                                 px-3 py-1 font-semibold rounded-full
                                 ${(report.disease_risk_level || "").includes("High") ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-600 border-blue-200"}
                              `}>
                        {report.disease_risk_level || report.alert_level || "Moderate Risk"}
                      </Badge>
                    </div>
                  </div>

                  {/* Middle Column: Health Data */}
                  <div className="w-full md:w-2/4 border-l border-slate-100 pl-6 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Prediction</p>
                      <p className="font-bold text-slate-800">{report.predicted_disease || "General Infection"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Symptoms ({report.people_affected || 1} affected)</p>
                      <div className="flex flex-wrap gap-2">
                        {report.symptoms && report.symptoms.length > 0 ? report.symptoms.map(s => (
                          <Badge key={s} variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-normal">{s}</Badge>
                        )) : <span className="text-sm text-slate-400">No specific symptoms recorded</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase">pH</div>
                        <div className="text-xl font-bold text-blue-600">{report.water_ph}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase">Turbidity</div>
                        <div className="text-xl font-bold text-green-600">{report.water_turbidity}</div>
                      </div>
                    </div>

                    {/* Display AI Advice if no worker advice yet */}
                    {!report.health_advice && report.disease_advice && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                        <span className="font-bold block mb-1">AI Recommendation:</span>
                        {report.disease_advice}
                      </div>
                    )}

                    {/* Display Worker Advice */}
                    {report.health_advice && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 animate-in fade-in">
                        <span className="font-bold flex items-center gap-2 mb-1">
                          <MessageSquarePlus className="h-4 w-4" /> Your Advice:
                        </span>
                        {report.health_advice}
                      </div>
                    )}

                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                      <span className="font-bold">Possible: {report.possible_organism || "Low Microbial Presence (Safe)"}</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="w-full md:w-1/4 border-l border-slate-100 pl-6 flex flex-col gap-3 justify-center print:hidden">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Actions</div>

                    <Button
                      onClick={() => openAdviceDialog(report.id, report.health_advice)}
                      className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm gap-2"
                    >
                      <MessageSquarePlus className="h-4 w-4" /> {report.health_advice ? "Update Advise" : "Advise"}
                    </Button>

                    <Button variant="outline" onClick={handlePrint} className="w-full border-slate-200 text-slate-600 gap-2">
                      <Printer className="h-4 w-4" /> Print
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleDelete(report.id)}
                      className="w-full border-slate-200 text-slate-600 gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>

                </div>
              </div>
            </Card>
          ))}
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
