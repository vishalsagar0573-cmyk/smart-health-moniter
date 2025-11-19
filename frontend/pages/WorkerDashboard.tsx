import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LogOut, AlertTriangle, TrendingUp, Activity, MessageSquarePlus, Printer, Download, FileText, Trash2, MapPin, Calendar, User } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { AdviceDialog } from "@/components/AdviceDialog";
import { getAutoAdvice } from "@/utils/adviceTemplates";
import { PrintableReport } from "@/components/PrintableReport";
import { useReactToPrint } from "react-to-print";
import { VillageMap } from "@/components/VillageMap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
}

interface VillageAdvice {
  id: string;
  village_name: string;
  risk_level: string;
  auto_advice: string[];
  custom_advice: string | null;
}

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [adviceMap, setAdviceMap] = useState<Record<string, VillageAdvice>>({});
  const [selectedVillage, setSelectedVillage] = useState<{
    name: string;
    riskLevel: string;
    advice: VillageAdvice | null;
  } | null>(null);
  const [showAdviceDialog, setShowAdviceDialog] = useState(false);
  const [printVillage, setPrintVillage] = useState<string | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    fetchReports();
    fetchAdvice();
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("health_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching reports",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      // Fetch submitter names
      const enrichedReports = await Promise.all(
        data.map(async (report) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", report.user_id)
            .single();
          
          return {
            ...report,
            submitter_name: profile?.full_name || "Unknown"
          };
        })
      );
      
      setReports(enrichedReports);
      processChartData(enrichedReports);
      processTimelineData(enrichedReports);
      processRiskDistribution(enrichedReports);
    }

    setLoading(false);
  };

  const fetchAdvice = async () => {
    const { data } = await supabase
      .from("village_advice")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const map: Record<string, VillageAdvice> = {};
      data.forEach((advice) => {
        map[advice.village_name] = advice;
      });
      setAdviceMap(map);
    }
  };

  const handleAddAdvice = (villageName: string, riskLevel: string) => {
    const existingAdvice = adviceMap[villageName];
    setSelectedVillage({
      name: villageName,
      riskLevel,
      advice: existingAdvice || null,
    });
    setShowAdviceDialog(true);
  };

  const handleAdviceSuccess = () => {
    fetchAdvice();
  };

  const handlePrintReport = (villageName?: string) => {
    setPrintVillage(villageName || null);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Village", "Date", "Submitter", "Symptoms", "Predicted Disease", "ML Risk Level", "People Affected", "pH", "Turbidity", "Latitude", "Longitude"],
      ...reports.map(r => [
        r.village_name,
        new Date(r.report_date).toLocaleDateString(),
        r.submitter_name || "Unknown",
        r.symptoms ? r.symptoms.join("; ") : "None",
        r.predicted_disease || "N/A",
        r.disease_risk_level || "N/A",
        r.people_affected || 0,
        r.water_ph,
        r.water_turbidity,
        r.latitude || "N/A",
        r.longitude || "N/A"
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const processChartData = (data: HealthReport[]) => {
    const villageData = data.reduce((acc: any, report) => {
      const total = report.fever_cases + report.diarrhea_cases + report.vomiting_cases;
      if (!acc[report.village_name]) {
        acc[report.village_name] = {
          village: report.village_name,
          totalCases: 0,
        };
      }
      acc[report.village_name].totalCases += total;
      return acc;
    }, {});

    setChartData(Object.values(villageData));
  };

  const processTimelineData = (data: HealthReport[]) => {
    const timeline = data
      .slice(0, 10)
      .reverse()
      .map(report => ({
        date: new Date(report.report_date).toLocaleDateString(),
        pH: report.water_ph,
        turbidity: report.water_turbidity,
      }));
    setTimelineData(timeline);
  };

  const processRiskDistribution = (data: HealthReport[]) => {
    const safe = data.filter(r => r.disease_risk_level === "Low" || (!r.disease_risk_level && r.alert_level === "safe")).length;
    const moderate = data.filter(r => r.disease_risk_level === "Moderate" || (!r.disease_risk_level && r.alert_level === "moderate")).length;
    const high = data.filter(r => r.disease_risk_level === "High" || (!r.disease_risk_level && r.alert_level === "high")).length;

    setRiskDistribution([
      { name: "Safe", value: safe, color: "hsl(var(--success))" },
      { name: "Moderate", value: moderate, color: "hsl(var(--warning))" },
      { name: "High Risk", value: high, color: "hsl(var(--destructive))" },
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteReport = async (reportId: string) => {
    setDeleteReportId(reportId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteReport = async () => {
    if (!deleteReportId) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("health_reports")
        .delete()
        .eq("id", deleteReportId);

      if (error) {
        console.error("Delete error:", error);
        const msg = error.message || "";
        const rlsHint = msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("not allowed");
        toast({
          title: "Error deleting report",
          description: rlsHint
            ? "Your current permissions do not allow deleting this report. Ask an admin to update RLS policies or delete the report."
            : (msg || "Failed to delete report. Please try again."),
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }

      toast({
        title: "Report deleted successfully",
        description: "The health report has been removed from the system.",
      });
      
      // Refresh reports list
      await fetchReports();
      
      setShowDeleteDialog(false);
      setDeleteReportId(null);
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error deleting report",
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getAlertBadge = (level: string) => {
    if (level === "high") {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />High Risk</Badge>;
    } else if (level === "moderate") {
      return <Badge className="bg-warning text-warning-foreground gap-1">⚠ Moderate</Badge>;
    }
    return <Badge className="bg-success gap-1">✓ Safe Zone</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const highRiskCount = reports.filter(r => r.disease_risk_level === "High" || (!r.disease_risk_level && r.alert_level === "high")).length;
  const totalCases = reports.reduce((sum, r) => sum + r.fever_cases + r.diarrhea_cases + r.vomiting_cases, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <header className="border-b bg-gradient-to-r from-card via-card to-primary/5 shadow-medical sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-medical-text">Health Worker Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Community Health Monitoring System</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleLogout} variant="outline" className="gap-2 shadow-sm hover:shadow-md transition-all">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
              <Button onClick={() => handlePrintReport()} variant="secondary" className="gap-2 shadow-sm hover:shadow-md transition-all">
                <Printer className="h-4 w-4" />
                Print All
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="gap-2 shadow-sm hover:shadow-md transition-all">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <Card className="border-primary/20 shadow-medical card-hover bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-primary">{reports.length}</div>
              <p className="text-xs text-muted-foreground mt-2">Across all villages</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-medical card-hover bg-gradient-to-br from-card to-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 bg-destructive/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                High Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-destructive">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 shadow-medical card-hover bg-gradient-to-br from-card to-secondary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-secondary">{totalCases}</div>
              <p className="text-xs text-muted-foreground mt-2">Combined symptoms reported</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <Card className="shadow-medical-lg border-primary/20 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
              <CardTitle className="text-lg">Cases by Village</CardTitle>
              <CardDescription className="text-sm mt-1">Total disease cases reported per village</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="village" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalCases" fill="hsl(var(--primary))" name="Total Cases" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="shadow-medical-lg border-primary/20 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
              <CardTitle className="text-lg">Risk Distribution</CardTitle>
              <CardDescription className="text-sm mt-1">Percentage of villages by risk level</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Line Chart */}
        <Card className="mb-8 shadow-medical-lg border-primary/20 animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
            <CardTitle className="text-lg">Water Quality Timeline</CardTitle>
            <CardDescription className="text-sm mt-1">pH and Turbidity levels over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pH" stroke="hsl(var(--primary))" strokeWidth={2} name="pH Level" />
                <Line type="monotone" dataKey="turbidity" stroke="hsl(var(--secondary))" strokeWidth={2} name="Turbidity (NTU)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Village Locations Map */}
        <VillageMap
          locations={reports
            .filter((r) => r.latitude && r.longitude)
            .map((r) => ({
              village_name: r.village_name,
              latitude: r.latitude!,
              longitude: r.longitude!,
              alert_level: r.alert_level,
              report_date: r.report_date,
            }))}
        />

        {/* Reports Section - Redesigned */}
        <Card className="shadow-medical-lg border-primary/20 animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl">All Village Reports with Safety Advice</CardTitle>
                <CardDescription className="text-sm mt-1">Detailed health data with auto-generated and custom safety suggestions</CardDescription>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No reports available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const computeBiology = (ph?: number, turbidity?: number) => {
                    if (ph === undefined || ph === null || turbidity === undefined || turbidity === null) {
                      return {
                        possible_organism: "Not enough data to analyze water biology.",
                        health_advice: "Not enough data to analyze water biology."
                      };
                    }
                    if (ph < 0 || ph > 14) {
                      return {
                        possible_organism: "Invalid pH value. Please check your measurement.",
                        health_advice: "Invalid pH value. Please check your measurement."
                      };
                    }
                    if (turbidity < 0) {
                      return {
                        possible_organism: "Invalid turbidity value. Please check your measurement.",
                        health_advice: "Invalid turbidity value. Please check your measurement."
                      };
                    }
                    if (ph < 5.5) {
                      return {
                        possible_organism: "Fungi or Iron Bacteria",
                        health_advice: "⚠️ UNSAFE FOR DRINKING: Water contains fungi or iron bacteria. Do not consume. Use alternative water sources or treat with proper filtration and disinfection."
                      };
                    } else if (ph >= 5.5 && ph < 6.5) {
                      return {
                        possible_organism: "Sulfur-Oxidizing Bacteria",
                        health_advice: "⚠️ CAUTION: Water may contain sulfur-oxidizing bacteria that can corrode pipes and cause unpleasant taste/odor. Boil water before drinking and consider water treatment."
                      };
                    } else if (ph >= 6.5 && ph <= 7.5 && turbidity <= 5) {
                      return {
                        possible_organism: "Low Microbial Presence (Safe)",
                        health_advice: "✅ SAFE: Water quality appears good with low microbial presence. Continue maintaining good hygiene practices and regular monitoring."
                      };
                    } else if (ph >= 6.5 && ph <= 7.5 && turbidity > 5) {
                      return {
                        possible_organism: "E. coli / Protozoa (Giardia)",
                        health_advice: "🔴 HIGH RISK: Possible E. coli or protozoan contamination (like Giardia). Boil water for at least 1 minute before drinking. Use water purification tablets or filters. Seek medical attention if symptoms develop."
                      };
                    } else if (ph >= 7.6 && ph <= 8.5) {
                      return {
                        possible_organism: "Cyanobacteria (Algae)",
                        health_advice: "⚠️ MODERATE RISK: Cyanobacteria (algae) may be present. While not always harmful, some types produce toxins. Boil water before drinking. If water has unusual color or odor, avoid consumption and seek alternative sources."
                      };
                    } else if (ph >= 8.6 && ph <= 9.0) {
                      return {
                        possible_organism: "Sulfate-Reducing Bacteria",
                        health_advice: "⚠️ UNSAFE: Water contains sulfate-reducing bacteria which can cause unpleasant odors and health issues. Do not drink. Use alternative water sources or professional water treatment."
                      };
                    }
                    return {
                      possible_organism: "Extreme Alkaline Conditions (Minimal Life)",
                      health_advice: "🔴 CHEMICALLY UNSAFE: Water is extremely alkaline and chemically unsafe for consumption. Do not drink. Use alternative water sources immediately."
                    };
                  };
                  const biology = (!report.possible_organism || !report.health_advice)
                    ? computeBiology(report.water_ph, report.water_turbidity)
                    : { possible_organism: report.possible_organism, health_advice: report.health_advice };
                  const autoAdvice = getAutoAdvice(report.alert_level);
                  const villageAdvice = adviceMap[report.village_name];
                  const riskColor = 
                    report.disease_risk_level === "High" ? "destructive" : 
                    report.disease_risk_level === "Moderate" ? "default" : 
                    "secondary";
                  
                  return (
                    <Card 
                      key={report.id} 
                      className="border-l-4 border-l-primary/50 hover:border-l-primary shadow-md hover:shadow-lg transition-all duration-300 card-hover"
                    >
                      <CardContent className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Left Section - Main Info */}
                          <div className="lg:col-span-8 space-y-4">
                            {/* Header Row */}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-bold text-primary">{report.village_name}</h3>
                                  {report.disease_risk_level && (
                                    <Badge 
                                      variant={riskColor as any}
                                      className="gap-1"
                                    >
                                      {report.disease_risk_level === "High" && <AlertTriangle className="h-3 w-3" />}
                                      {report.disease_risk_level} Risk
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(report.report_date).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {report.submitter_name || "Unknown"}
                                  </div>
                                  {report.latitude && report.longitude && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      <span className="text-xs">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Symptoms Section */}
                            {report.symptoms && report.symptoms.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-semibold text-muted-foreground">
                                  Symptoms ({report.people_affected || 1} {report.people_affected === 1 ? 'person' : 'people'} affected):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {report.symptoms.map((symptom, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {symptom.replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Disease Prediction */}
                            {report.predicted_disease && (
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                                    report.disease_risk_level === "High" ? "text-destructive" :
                                    report.disease_risk_level === "Moderate" ? "text-warning" :
                                    "text-secondary"
                                  }`} />
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">Predicted Disease: {report.predicted_disease}</p>
                                    {report.disease_advice && (
                                      <p className="text-xs text-muted-foreground mt-1">{report.disease_advice}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Water Quality Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                                <p className="text-xs text-muted-foreground mb-1">Water pH</p>
                                <p className="text-lg font-bold text-secondary">{report.water_ph}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <p className="text-xs text-muted-foreground mb-1">Turbidity</p>
                                <p className="text-lg font-bold text-primary">{report.water_turbidity} NTU</p>
                              </div>
                              {biology.possible_organism && (
                                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                  <p className="text-xs text-muted-foreground mb-1">Possible Organism</p>
                                  <p className="text-sm font-semibold">{biology.possible_organism}</p>
                                </div>
                              )}
                              {biology.health_advice && (
                                <div className="p-3 rounded-lg bg-muted/50 border">
                                  <p className="text-xs text-muted-foreground mb-1">Health Advice</p>
                                  <p className="text-xs">{biology.health_advice}</p>
                                </div>
                              )}
                              <div className="p-3 rounded-lg bg-muted/50 border">
                                <p className="text-xs text-muted-foreground mb-1">Fever Cases</p>
                                <p className="text-lg font-bold">{report.fever_cases}</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50 border">
                                <p className="text-xs text-muted-foreground mb-1">Diarrhea Cases</p>
                                <p className="text-lg font-bold">{report.diarrhea_cases}</p>
                              </div>
                            </div>
                          </div>

                          {/* Right Section - Actions & Advice */}
                          <div className="lg:col-span-4 space-y-4 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
                            {/* Worker Advice */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-muted-foreground">Health Worker Advice</p>
                              {villageAdvice?.custom_advice ? (
                                <div className="p-3 rounded-lg bg-accent/30 border border-accent/50 text-sm">
                                  {villageAdvice.custom_advice}
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-muted/30 border text-sm text-muted-foreground">
                                  No custom advice provided
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => handleAddAdvice(report.village_name, report.disease_risk_level || report.alert_level)}
                              >
                                <MessageSquarePlus className="h-4 w-4" />
                                {villageAdvice ? "Edit" : "Add"} Advice
                              </Button>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-muted-foreground">Actions</p>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full gap-2"
                                  onClick={() => handlePrintReport(report.village_name)}
                                >
                                  <Printer className="h-4 w-4" />
                                  Print Report
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="w-full gap-2"
                                  onClick={() => handleDeleteReport(report.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Report
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedVillage && (
        <AdviceDialog
          open={showAdviceDialog}
          onOpenChange={setShowAdviceDialog}
          villageName={selectedVillage.name}
          riskLevel={selectedVillage.riskLevel}
          autoAdvice={getAutoAdvice(selectedVillage.riskLevel)}
          existingAdvice={selectedVillage.advice}
          onSuccess={handleAdviceSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setDeleteReportId(null);
          setDeleting(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Health Report
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this health report? This action cannot be undone. All data associated with this report will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteReportId(null);
                setDeleting(false);
              }}
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReport}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Deleting...
                </span>
              ) : (
                "Delete Report"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Print Component */}
      <div className="hidden">
        <div ref={printRef}>
          <PrintableReport reports={reports} village={printVillage || undefined} />
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
