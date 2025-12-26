import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Activity, CheckCircle2, ChevronRight, Upload, MapPin,
  AlertTriangle, Droplets, Thermometer, FileText,
  AlertCircle, Info, Camera, RefreshCw, MessageSquarePlus, Loader2,
  Zap, Brain, Eye, Sun, Wind, User, Maximize, Flame, Frown, BatteryWarning,
  Beaker, GripHorizontal, LucideIcon, Feather, Expand, TrendingDown, Tent
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPossibleOrganisms } from "@/utils/biologyUtils";
import { translations, Language } from "@/utils/translations";

const VillagerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'en');
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  const getDiseaseKey = (name: string) => {
    if (!name) return "";
    if (name.includes("Malaria")) return "malaria";
    if (name.includes("Dengue")) return "dengue";
    if (name.includes("Cholera")) return "cholera";
    if (name.includes("Typhoid")) return "typhoid";
    if (name.includes("Hepatitis")) return "hepatitis";
    if (name.includes("Dysentery")) return "dysentery";
    if (name.includes("Gastritis")) return "gastritis";
    if (name.includes("Food Poisoning")) return "food_poisoning";
    if (name.includes("Flu")) return "flu";
    if (name.includes("Skin")) return "skin_inf";
    if (name.includes("Respiratory")) return "resp_inf";
    if (name.includes("Gastroenteritis")) return "acute_gastro";
    if (name.includes("Viral Fever")) return "viral_fever";
    if (name.includes("Diarrheal")) return "mild_diarrhea";
    if (name.includes("General Health")) return "gen_health";
    if (name.includes("General Viral") || name.includes("Infection")) return "general_viral";
    if (name.includes("No Symptoms")) return "no_symptoms";
    return "";
  };

  // Form Data
  const [formData, setFormData] = useState({
    village_name: "",
    hasIllness: true,
    symptoms: [] as string[],
    otherSymptom: "",
    peopleAffected: 0, // Default to 0 as requested
    waterImage: null as File | null,
    imagePreview: null as string | null,
    ph: "" as string | number,
    turbidity: "" as string | number,
    waterAdvice: "",
    waterRisk: "",
    location: null as { lat: number; lng: number } | null,
    diseasePrediction: null as any
  });

  useEffect(() => {
    fetchUser();
    fetchReports();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (data) setUserName(data.full_name || "User");
    }
  };

  const fetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("health_reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    if (data) setReports(data);
  };

  const toggleSymptom = (id: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(id)
        ? prev.symptoms.filter(s => s !== id)
        : [...prev.symptoms, id]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      waterImage: file,
      imagePreview: previewUrl,
      ph: "",
      turbidity: ""
    }));
  };

  const analyzeImage = async () => {
    if (!formData.waterImage) return;

    setIsAnalyzing(true);
    toast({ title: "Analyzing Water Quality...", description: "Uploading image and processing..." });

    try {
      const file = formData.waterImage;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('water_images')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('water_images')
        .getPublicUrl(filePath);

      const response = await fetch('http://localhost:8000/analyze-water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || "Failed to analyze image");
      }

      setFormData(prev => ({
        ...prev,
        ph: data.ph,
        turbidity: data.turbidity,
        waterAdvice: data.advice,
        waterRisk: data.water_safety || data.water_quality
      }));

      toast({
        title: "Water Analysis Successful",
        description: `pH: ${data.ph} | Turbidity: ${data.turbidity} NTU. ${data.advice}`,
        className: "bg-green-50 border-green-200 text-green-800 border-l-4"
      });

    } catch (error: any) {
      console.error("Analysis Error:", error);
      toast({
        title: "Image Analysis Failed",
        description: error.message || "Could not analyze the image. Is it a clear water photo?",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Error", description: "You must be logged in to submit a report", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Prepare payload
      const payload = {
        user_id: user.id,
        village_name: formData.village_name,
        // report_date removed as it does not exist in the schema
        water_ph: typeof formData.ph === 'number' ? formData.ph : parseFloat(formData.ph as string) || 0,
        water_turbidity: typeof formData.turbidity === 'number' ? formData.turbidity : parseFloat(formData.turbidity as string) || 0,
        symptoms: formData.symptoms,
        people_affected: formData.peopleAffected,
        predicted_disease: formData.diseasePrediction?.disease || "Pending Analysis",
        disease_risk_level: formData.diseasePrediction?.risk || "Unknown",
        disease_advice: formData.diseasePrediction?.advice || "Please consult a doctor.",
        // Default values for required fields if they exist as not null constraints
        fever_cases: formData.symptoms.includes('fever') ? 1 : 0,
        diarrhea_cases: formData.symptoms.includes('diarrhea') ? 1 : 0,
        vomiting_cases: formData.symptoms.includes('vomiting') ? 1 : 0,
        alert_level: formData.diseasePrediction?.risk || "Moderate",
        alert_message: "Report submitted by villager",
        // submitter_name removed as it does not exist in the schema
        latitude: formData.location?.lat || null,
        longitude: formData.location?.lng || null
      };

      const { error } = await supabase
        .from("health_reports")
        .insert([payload]);

      if (error) throw error;

      await fetchReports();
      setStep(3); // Move to a "Success" step or reset

      // Reset form (keeping it simple for now, maybe redirect to list)
      setFormData({
        village_name: "",
        hasIllness: true,
        symptoms: [],
        otherSymptom: "",
        peopleAffected: 1,
        waterImage: null,
        imagePreview: null,
        ph: "",
        turbidity: "",
        waterAdvice: "",
        waterRisk: "",
        location: null,
        diseasePrediction: null
      });

      toast({ title: "Report Submitted Successfully", description: "Your health report has been recorded." });

    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPrediction = async () => {
    // Advanced Scoring-Based Prediction Logic
    const s = formData.symptoms;
    const has = (id: string) => s.includes(id);

    // Define Disease Profiles with scoring weights
    const diseases = [
      {
        name: "Malaria",
        risk: "High",
        symptoms: ['fever', 'headache', 'body_pain', 'vomiting', 'weakness'],
        required: ['fever'],
        advice: "Urgent: Test for Malaria/Dengue. Use mosquito nets. Take paracetamol for fever (avoid aspirin)."
      },
      {
        name: "Dengue",
        risk: "High",
        symptoms: ['fever', 'rashes', 'body_pain', 'headache', 'weakness'],
        required: ['fever'],
        // Bonus logic: Rashes is a strong indicator
        advice: "Check platelet count. Hydrate well. Watch for bleeding gums."
      },
      {
        name: "Cholera",
        risk: "High",
        symptoms: ['diarrhea', 'dehydration', 'vomiting', 'weakness'],
        required: ['diarrhea', 'dehydration'],
        advice: "Critical: Rehydrate immediately with ORS. Seek hospital care if symptoms persist > 24hrs."
      },
      {
        name: "Typhoid",
        risk: "Moderate",
        symptoms: ['fever', 'stomach_pain', 'headache', 'weakness'],
        required: ['fever', 'stomach_pain'],
        advice: "Consult doctor for blood culture/Widal test. Drink boiled water and eat cooked soft food."
      },
      {
        name: "Hepatitis / Jaundice",
        risk: "Moderate",
        symptoms: ['jaundice', 'dark_urine', 'nausea', 'stomach_pain', 'weakness'],
        required: [], // Custom check below
        advice: "Avoid oily/spicy food. Rest completely. Drink plenty of sugarcane juice or glucose water."
      },
      {
        name: "Dysentery",
        risk: "High",
        symptoms: ['blood_stool', 'stomach_pain', 'diarrhea', 'fever'],
        required: ['blood_stool'],
        advice: "Seek medical help immediately. Requires stool test and antibiotics."
      },
      {
        name: "Acute Diarrhea / Gastritis",
        risk: "Moderate",
        symptoms: ['diarrhea', 'stomach_pain', 'nausea', 'headache', 'weakness'],
        required: ['diarrhea'],
        advice: "Hydrate with ORS/fluids. Eat light foods (bananas, rice, toast). Consult doctor if it lasts > 2 days."
      },
      {
        name: "Gastroenteritis / Food Poisoning",
        risk: "Moderate",
        symptoms: ['vomiting', 'stomach_pain', 'diarrhea', 'nausea', 'fever'],
        required: ['vomiting'],
        advice: "Hydrate with ORS. Avoid solid foods for a few hours. Consult a doctor if vomiting persists."
      },
      {
        name: "Respiratory Infection / Flu",
        risk: "Moderate",
        symptoms: ['cough', 'fever', 'headache', 'weakness', 'body_pain'],
        required: ['cough'],
        advice: "Isolate if possible. Wear mask. Steam inhalation may help."
      }
    ];

    // Calculate Scores
    let bestMatch = {
      disease: "General Viral/New Infection",
      risk: "Low",
      score: 0,
      advice: "Monitor symptoms closely. specific diagnosis requires more data. Stay hydrated."
    };

    diseases.forEach(d => {
      let score = 0;

      // 1. Check Requirements
      const meetsRequirements = d.required.length > 0 ? d.required.every(req => has(req)) : false;

      // Special check for Jaundice (logical OR for key symptoms)
      const matchesJaundice = d.name.includes("Hepatitis") && (has('jaundice') || has('dark_urine'));

      // If it has no required fields (and isn't the special case), we might skip strict check, 
      // but purely symptom matching might be too loose. 
      // Let's enforce: EITHER meets strict requirements OR is the special Jaundice case.
      // For Malaria/Dengue/Flu which share fever, requirements help distinguish.

      if (meetsRequirements || matchesJaundice) {
        // 2. Calculate Score based on matching symptoms
        d.symptoms.forEach(sym => {
          if (has(sym)) score += 1;
        });

        // 3. Weighting modifiers
        if (d.name === "Dengue" && has('rashes')) score += 2; // Rashes strongly indicates Dengue over Malaria
        if (d.name === "Cholera" && has('dehydration')) score += 2; // Dehydration is critical for Cholera
        if (d.name === "Dysentery" && has('blood_stool')) score += 3; // Pathognomonic
        if (d.name === "Hepatitis / Jaundice" && (has('jaundice') || has('dark_urine'))) score += 3; // Strong indicator
        if (d.name === "Typhoid" && has("stomach_pain") && has("fever")) score += 1; // Combo bonus

        // 4. Update Best Match
        if (score > bestMatch.score) {
          bestMatch = { disease: d.name, risk: d.risk, advice: d.advice, score };
        }
      }
    });

    // Fallback if score is too low but symptoms exist
    if (bestMatch.score < 2 && s.length > 0) {
      // Keep general if nothing matches strongly
    } else if (s.length === 0) {
      bestMatch = { disease: "No Symptoms Selected", risk: "None", advice: "Please select symptoms to get a prediction.", score: 0 };
    }

    // 5. Override for Severe Outbreak Risk based on affected people count
    if (s.length > 3 && formData.peopleAffected > 15) {
      bestMatch = {
        disease: "Potential Severe Outbreak",
        risk: "Severe",
        score: 100,
        advice: "CRITICAL ALERT: Very high number of affected people with multiple symptoms. Contact authorities immediately."
      };
    } else if (s.length === 3 && formData.peopleAffected >= 12) {
      bestMatch = {
        disease: "Potential Moderate Outbreak",
        risk: "Moderate",
        score: 99,
        advice: "Warning: Significant number of affected people detected. Monitor situation closely and ensure clean water supply."
      };
    }

    setFormData(prev => ({
      ...prev,
      diseasePrediction: {
        disease: bestMatch.disease,
        risk: bestMatch.risk,
        advice: bestMatch.advice
      }
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const symptomsList = [
    { id: "diarrhea", label: "Frequent loose motion (diarrhea)", icon: <Droplets className="h-10 w-10" /> },
    { id: "vomiting", label: "Vomiting", icon: <Frown className="h-10 w-10" /> },
    { id: "fever", label: "High fever", icon: <Thermometer className="h-10 w-10" /> },
    { id: "stomach_pain", label: "Stomach or abdominal pain", icon: <Flame className="h-10 w-10" /> },
    { id: "nausea", label: "Nausea / loss of appetite", icon: <Frown className="h-10 w-10" /> },
    { id: "weakness", label: "Weakness / tiredness", icon: <Feather className="h-10 w-10" /> },
    { id: "headache", label: "Headache", icon: <Brain className="h-10 w-10" /> },
    { id: "jaundice", label: "Yellow eyes or skin (Jaundice)", icon: <Eye className="h-10 w-10" /> },
    { id: "dark_urine", label: "Dark yellow urine", icon: <Beaker className="h-10 w-10" /> },
    { id: "dehydration", label: "Dehydration (dry mouth, less urination)", icon: <Sun className="h-10 w-10" /> },
    { id: "rashes", label: "Itchy skin / rashes", icon: <GripHorizontal className="h-10 w-10" /> },
    { id: "body_pain", label: "Body pain", icon: <User className="h-10 w-10" /> },
    { id: "swelling", label: "Swelling in legs or abdomen", icon: <Expand className="h-10 w-10" /> },
    { id: "blood_stool", label: "Blood in stool", icon: <Droplets className="h-10 w-10 text-red-500" /> },
    { id: "cough", label: "Persistent cough", icon: <Wind className="h-10 w-10" /> },
  ];

  const getWaterRisk = (ph: any, turb: any) => {
    if (!ph || !turb) return "Unknown";
    if (ph >= 6.5 && ph <= 8.5 && turb < 5) return "Safe";
    return "Unsafe";
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    toast({ title: "Locating...", description: "Fetching your current location..." });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
        toast({
          title: "Location Found",
          description: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`,
          className: "bg-green-50 text-green-800 border-green-200"
        });
      },
      (error) => {
        console.error("Location Error:", error);
        let msg = "Unable to retrieve your location.";
        if (error.code === 1) msg = "Location permission denied.";
        if (error.code === 2) msg = "Location unavailable.";
        if (error.code === 3) msg = "Location request timed out.";

        toast({
          title: "Location Failed",
          description: msg,
          variant: "destructive"
        });
      }
    );
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 pb-20 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-serif font-normal text-slate-800 flex items-center gap-3 tracking-wide">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-300">
              <Activity className="h-7 w-7" />
            </div>
            {t.dashboardTitle}
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 mr-4 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              {(['en', 'hi', 'kn', 'te'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${lang === l ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}
                >
                  {l === 'en' ? 'EN' : l === 'hi' ? 'हिंदी' : l === 'kn' ? 'ಕನ್ನಡ' : 'తెలుగు'}
                </button>
              ))}
            </div>
            <span className="text-lg font-bold text-slate-700 hidden sm:inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-slate-200 shadow-sm h-14">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-green-500/50 shadow-sm"></div>
              {userName}
            </span>
            <Button variant="ghost" size="lg" onClick={handleLogout} className="text-slate-600 hover:text-white hover:bg-red-500 font-bold transition-all rounded-xl px-8 h-14 text-lg border-2 border-slate-100 hover:border-red-500">
              {t.logout}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Main Form Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl shadow-blue-900/5 mb-8 overflow-hidden rounded-2xl ring-1 ring-black/5">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 border-b border-indigo-500 p-6 pb-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight">{t.submitReportTitle}</h2>
                  <p className="text-blue-100 font-medium">{t.submitReportDesc}</p>
                </div>
              </div>
            </div>

            {/* Modern Step Indicator */}
            {/* Modern Step Indicator */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center relative z-0">
                {/* Progress Bar Background */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-white/20 -z-10 rounded-full"></div>
                {/* Active Progress */}
                <div className={`absolute left-0 top-1/2 h-1 bg-cyan-400 -z-10 rounded-full transition-all duration-500 ease-in-out shadow-[0_0_10px_rgba(34,211,238,0.5)]`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all duration-300 z-10
                        ${step >= s
                        ? 'bg-white text-blue-700 border-cyan-400 shadow-lg scale-110'
                        : 'bg-blue-800/40 text-blue-200 border-blue-500/30 backdrop-blur-sm'}
                    `}>
                      {s === 3 && step === 3 ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : s}
                    </div>
                    {s < 3 && <div className="w-16 md:w-24"></div>} {/* Spacer */}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between w-64 md:w-80 mx-auto text-xs font-semibold text-blue-100 mt-2 text-center pl-2">
              <span>{t.date || "Details"}</span>
              <span>{t.waterQuality || "Water"}</span>
              <span>{t.diseaseRisk || "Result"}</span>
            </div>
          </div>

          <CardContent className="p-6 md:p-8">
            {/* Step 1: Health Details */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-lg">{t.villageName}</Label>
                  <Input
                    value={formData.village_name}
                    onChange={e => setFormData({ ...formData, village_name: e.target.value })}
                    placeholder={t.villageNamePlaceholder}
                    className="h-14 text-lg bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold text-lg">{t.illnessQuestion}</Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50">
                      <input type="radio" name="illness" className="w-6 h-6 text-blue-600" checked={formData.hasIllness} onChange={() => setFormData({ ...formData, hasIllness: true })} />
                      <span className="font-bold text-lg">{t.yes}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50">
                      <input type="radio" name="illness" className="w-6 h-6 text-blue-600" checked={!formData.hasIllness} onChange={() => setFormData({ ...formData, hasIllness: false })} />
                      <span className="font-bold text-lg">{t.no}</span>
                    </label>
                  </div>
                </div>

                {formData.hasIllness && (
                  <div className="space-y-3">
                    <Label className="text-blue-600 font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4" /> {t.selectSymptoms}
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {symptomsList.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleSymptom(s.id)}
                          className={`
                                      group relative p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 h-40
                                      shadow-sm hover:shadow-lg hover:-translate-y-1
                                      ${formData.symptoms.includes(s.id)
                              ? 'border-transparent bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                            }
                                   `}
                        >
                          {formData.symptoms.includes(s.id) && (
                            <div className="absolute top-2 right-2 text-white animate-in zoom-in spin-in-90 duration-300">
                              <CheckCircle2 className="h-6 w-6" />
                            </div>
                          )}
                          <div className={`p-4 rounded-full transition-colors duration-300 ${formData.symptoms.includes(s.id) ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md'}`}>
                            {s.icon}
                          </div>
                          <span className="text-sm md:text-base font-semibold leading-tight">{t[('syp_' + s.id) as keyof typeof t] || s.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label className="font-bold text-lg">{t.otherSymptom}</Label>
                      <Input
                        value={formData.otherSymptom}
                        onChange={e => setFormData({ ...formData, otherSymptom: e.target.value })}
                        placeholder={t.otherSymptomPlaceholder}
                        className="h-14 text-lg bg-slate-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold text-lg">{t.peopleAffected}</Label>
                      <Input
                        type="number"
                        value={formData.peopleAffected}
                        onChange={e => setFormData({ ...formData, peopleAffected: parseInt(e.target.value) || 1 })}
                        className="h-14 text-lg bg-slate-50"
                      />
                    </div>

                    <Button
                      onClick={handlePreviewPrediction}
                      variant="outline"
                      className="w-full h-12 border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
                    >
                      {t.previewDiseasePrediction}
                    </Button>

                    {formData.diseasePrediction && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex gap-3 text-blue-900">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-blue-700 mb-1">
                            {t.diseaseRisk}: {t[('dis_' + getDiseaseKey(formData.diseasePrediction.disease)) as keyof typeof t] || formData.diseasePrediction.disease} ({t[('risk_' + formData.diseasePrediction.risk.toLowerCase()) as keyof typeof t] || formData.diseasePrediction.risk})
                          </p>
                          <p className="text-sm text-blue-800/80 leading-relaxed">
                            {t[('adv_' + getDiseaseKey(formData.diseasePrediction.disease)) as keyof typeof t] || formData.diseasePrediction.advice}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/20 h-12 px-8 rounded-xl font-bold text-white">
                    Next Step <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Water Quality */}
            {step === 2 && (
              <div className="space-y-8 animate-fade-in text-center">
                <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 bg-blue-50/30">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
                    <Camera className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">{t.uploadWaterImage}</h3>
                  <p className="text-sm text-slate-500 mb-6">{t.uploadWaterImageDesc}</p>

                  {!formData.imagePreview ? (
                    <label className="cursor-pointer inline-block">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      {formData.imagePreview ?
                        <img src={formData.imagePreview} className="max-h-48 rounded-lg shadow-sm" /> :
                        <div className="h-48 w-64 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                          No image selected
                        </div>
                      }
                      <div className="mt-4 px-6 py-2 bg-white border border-blue-200 text-blue-600 font-semibold rounded-lg shadow-sm hover:bg-blue-50 transition-colors">
                        {t.uploadButton}
                      </div>
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <img src={formData.imagePreview} className="max-h-56 mx-auto rounded-lg shadow-md border-4 border-white" />
                      <label className="cursor-pointer inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700">
                        <RefreshCw className="h-4 w-4" /> Change Photo
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 text-left">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.phLevel}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.ph}
                      onChange={(e) => setFormData({ ...formData, ph: parseFloat(e.target.value) || "" })}
                      className="h-12 bg-white font-mono text-lg"
                      placeholder="e.g. 7.0"
                    />
                    <p className="text-xs text-slate-400">AI-detected or manually entered.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">{t.turbidity}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.turbidity}
                      onChange={(e) => setFormData({ ...formData, turbidity: parseFloat(e.target.value) || "" })}
                      className="h-12 bg-white font-mono text-lg"
                      placeholder="e.g. 1.0"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600">Back</Button>
                  <div className="flex gap-4">
                    <Button onClick={analyzeImage} disabled={isAnalyzing || !formData.imagePreview} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg h-12 rounded-xl">
                      {isAnalyzing ? <Loader2 className="animate-spin" /> : t.analyzeImage}
                    </Button>
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.02] transition-transform shadow-lg shadow-green-500/20 h-12 px-8 rounded-xl font-bold w-full sm:w-auto text-lg text-white">
                      <CheckCircle2 className="mr-2 h-5 w-5" /> {t.submitReport}
                    </Button>
                  </div>
                </div>

                {(formData.ph && formData.turbidity) && (
                  <div className="flex flex-col items-center gap-2 mt-6">
                    <div className="flex gap-4 text-sm font-semibold mb-2">
                      <span className={Number(formData.ph) >= 6.5 && Number(formData.ph) <= 8.5 ? "text-green-600" : "text-red-500"}>
                        pH: {Number(formData.ph) >= 6.5 && Number(formData.ph) <= 8.5 ? "Safe" : "Unsafe"}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className={Number(formData.turbidity) < 5 ? "text-green-600" : "text-red-500"}>
                        Turbidity: {Number(formData.turbidity) < 5 ? "Safe" : "High Risk"}
                      </span>
                    </div>
                    <Badge variant="outline" className={`px-4 py-1.5 text-sm font-bold shrink-0 ${(formData.waterRisk === 'Safe' || getWaterRisk(formData.ph, formData.turbidity) === 'Safe')
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t.waterQuality}: {t[('risk_' + (formData.waterRisk || getWaterRisk(formData.ph, formData.turbidity)).toLowerCase()) as keyof typeof t] || formData.waterRisk || getWaterRisk(formData.ph, formData.turbidity)}
                    </Badge>

                    {formData.waterAdvice && (
                      <div className="text-sm font-medium text-slate-700 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg max-w-md mx-auto">
                        💡 {t.viewAdvice}: {formData.waterAdvice}
                      </div>
                    )}
                  </div>
                )}

                <div className={`bg-white border p-4 rounded-xl flex items-center justify-between mt-6 transition-colors ${formData.location ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <MapPin className={`h-5 w-5 ${formData.location ? "text-green-600" : "text-blue-500"}`} />
                    {formData.location ? (
                      <span className="text-green-700 font-bold">Location Set: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}</span>
                    ) : "Include My Location"}
                  </div>
                  <Button
                    variant={formData.location ? "ghost" : "outline"}
                    size="sm"
                    onClick={handleGetLocation}
                    className={formData.location ? "text-green-700 hover:text-green-800 hover:bg-green-100" : ""}
                  >
                    {formData.location ? "Update Location" : "Send My Location"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.msg_report_submitted}</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    {t.msg_report_thanks || "Thank you for your contribution. Your report has been sent to the health department and will help prevent disease outbreaks."}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => setStep(1)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/20 h-12 px-8 rounded-xl font-bold text-white"
                  >
                    {t.submitReportTitle || "Submit Another Report"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="h-12 px-6"
                  >
                    {t.cancel || "Return Home"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">{t.recentReports}</h2>
          <p className="text-slate-500 -mt-3 mb-4">{t.recentReportsDesc || "Last 5 health reports you submitted"}</p>

          {reports.map((report) => {
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
              `}>

                {/* Colored Side Bar Accent */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 
                ${isHigh ? "bg-red-500" : isModerate ? "bg-orange-500" : "bg-emerald-500"}`}
                />

                <div className="p-6 pl-8">
                  <div className="flex flex-col xl:flex-row gap-6">

                    {/* Left Column: Village Info */}
                    <div className="w-full xl:w-1/4 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1">{report.village_name}</h3>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> Location Report
                        </p>
                      </div>

                      <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white/50 shadow-sm">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {(userName || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Submitted By</p>
                          <p className="font-semibold text-slate-700 text-sm">{userName || "Me"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{t.date || "Date"}</span>
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
                            <Activity className="h-3 w-3" /> {t.diseaseRisk || "Prediction"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-slate-800">
                            {t[('dis_' + getDiseaseKey(report.predicted_disease)) as keyof typeof t] || report.predicted_disease || "Analysis Pending"}
                          </p>
                        </div>
                      </div>

                      {/* Symptoms */}
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.selectSymptoms} ({report.people_affected || 1})</p>
                        <div className="flex flex-wrap gap-2">
                          {report.symptoms && report.symptoms.length > 0 ? report.symptoms.map((s: string) => (
                            <span key={s} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 shadow-sm">
                              {t[('syp_' + s) as keyof typeof t] || s.replace(/_/g, " ")}
                            </span>
                          )) : <span className="text-sm text-slate-400 italic">No specific symptoms recorded</span>}
                        </div>
                      </div>

                      {/* Water Quality Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center group-hover:bg-blue-50 transition-colors">
                          <div className="text-xs text-blue-400 font-bold uppercase mb-1">{t.phLevel || "pH Level"}</div>
                          <div className="text-3xl font-black text-blue-600 tracking-tight">{report.water_ph}</div>
                          <div className={`h-1 w-12 rounded-full mt-2 ${report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-xs font-bold mt-1 ${report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'text-green-600' : 'text-red-500'}`}>
                            {report.water_ph >= 6.5 && report.water_ph <= 8.5 ? 'Safe' : (report.water_ph < 6.5 ? 'Acidic' : 'Alkaline')}
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center group-hover:bg-emerald-50 transition-colors">
                          <div className="text-xs text-emerald-500 font-bold uppercase mb-1">{t.turbidity || "Turbidity"}</div>
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
                          <span className="block text-xs font-bold text-red-400 uppercase">{t.possibleOrganism || "Microbial Risk"}</span>
                          <span className="font-semibold text-red-700">{report.possible_organism || t.org_low_microbial || "Low Risk / None Detected"}</span>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Advice */}
                    <div className="w-full xl:w-1/4 flex flex-col gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Medical Camp Notification */}
                        {(report.medical_camp_arranged || report.alert_message === "MEDICAL_CAMP_ARRANGED") && (
                          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900 shadow-sm animate-pulse relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-red-100 rounded-full text-red-600">
                                <Tent className="h-4 w-4" />
                              </div>
                              <p className="text-xs font-bold text-red-600 uppercase">Medical Action Taken</p>
                            </div>
                            <p className="text-sm font-bold leading-relaxed">
                              "Medical camp has been arranged. A doctor will visit your village soon. Please follow health guidelines and be prepared."
                            </p>
                          </div>
                        )}

                        {/* Display Worker Advice (Top Priority) */}
                        {report.health_advice ? (
                          <div className="bg-amber-100/50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                              <MessageSquarePlus className="h-16 w-16" />
                            </div>
                            <p className="text-xs font-bold text-amber-600 uppercase mb-2">Health Worker Message</p>
                            <p className="relative z-10 font-bold leading-relaxed">"{report.health_advice}"</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-sm text-center">
                            Waiting for health worker review...
                          </div>
                        )}

                        {/* AI Advice Summary */}
                        {!report.health_advice && report.disease_advice && (
                          <div className="text-xs text-slate-500 bg-white/50 p-3 rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-600">AI Suggestion:</span> {t[('adv_' + getDiseaseKey(report.predicted_disease)) as keyof typeof t] || report.disease_advice}
                          </div>
                        )}
                      </div>

                      {/* Read More / Print Actions */}
                      {/* You can add a print button here for the villager too if desired, keeping it clean for now */}
                    </div>

                  </div>
                </div>
              </Card>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default VillagerDashboard;
