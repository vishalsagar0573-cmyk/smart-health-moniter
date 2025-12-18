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
  Trash2, AlertTriangle, Droplets, Thermometer, FileText,
  AlertCircle, Info, Camera, RefreshCw, MessageSquarePlus, Loader2
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
    peopleAffected: 7, // Default from screenshot
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
        alert_message: "Report submitted by villager"
        // submitter_name removed as it does not exist in the schema
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

    // 5. Override for Severe Outbreak Risk (Large number of people affected + multiple symptoms)
    if (formData.peopleAffected >= 15 && s.length >= 4) {
      bestMatch = {
        disease: "Potential Disease Outbreak",
        risk: "Severe",
        score: 99, // Max priority
        advice: "Warning: High number of affected people with multiple symptoms detected. Isolate affected individuals immediately and contact district health officials."
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
    { id: "diarrhea", label: "Frequent loose motion (diarrhea)", icon: <Activity className="h-5 w-5" /> },
    { id: "vomiting", label: "Vomiting", icon: <Activity className="h-5 w-5" /> },
    { id: "fever", label: "High fever", icon: <CheckCircle2 className="h-5 w-5" /> },
    { id: "stomach_pain", label: "Stomach or abdominal pain", icon: <Activity className="h-5 w-5" /> },
    { id: "nausea", label: "Nausea / loss of appetite", icon: <Activity className="h-5 w-5" /> },
    { id: "weakness", label: "Weakness / tiredness", icon: <CheckCircle2 className="h-5 w-5" /> },
    { id: "headache", label: "Headache", icon: <Activity className="h-5 w-5" /> },
    { id: "jaundice", label: "Yellow eyes or skin (Jaundice)", icon: <Activity className="h-5 w-5" /> },
    { id: "dark_urine", label: "Dark yellow urine", icon: <Activity className="h-5 w-5" /> },
    { id: "dehydration", label: "Dehydration (dry mouth, less urination)", icon: <Activity className="h-5 w-5" /> },
    { id: "rashes", label: "Itchy skin / rashes", icon: <Activity className="h-5 w-5" /> },
    { id: "body_pain", label: "Body pain", icon: <Activity className="h-5 w-5" /> },
    { id: "swelling", label: "Swelling in legs or abdomen", icon: <Activity className="h-5 w-5" /> },
    { id: "blood_stool", label: "Blood in stool", icon: <Activity className="h-5 w-5" /> },
    { id: "cough", label: "Persistent cough", icon: <Activity className="h-5 w-5" /> },
  ];

  const getWaterRisk = (ph: any, turb: any) => {
    if (!ph || !turb) return "Unknown";
    if (ph >= 6.5 && ph <= 8.5 && turb < 5) return "Safe";
    return "Unsafe";
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("health_reports").delete().eq("id", id);
    if (!error) fetchReports();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 pb-20 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 flex items-center gap-2 tracking-tight">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-300">
              <Activity className="h-5 w-5" />
            </div>
            {t.dashboardTitle}
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 mr-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {(['en', 'hi', 'kn', 'te'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${lang === l ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                >
                  {l === 'en' ? 'EN' : l === 'hi' ? 'हिंदी' : l === 'kn' ? 'ಕನ್ನಡ' : 'తెలుగు'}
                </button>
              ))}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline-flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              {userName}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-red-600 hover:bg-red-50">{t.logout}</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Main Form Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl shadow-blue-900/5 mb-8 overflow-hidden rounded-2xl ring-1 ring-black/5">
          <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-indigo-50 p-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{t.submitReportTitle}</h2>
                  <p className="text-sm text-slate-500">{t.submitReportDesc}</p>
                </div>
              </div>
            </div>

            {/* Modern Step Indicator */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center relative z-0">
                {/* Progress Bar Background */}
                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 rounded-full"></div>
                {/* Active Progress */}
                <div className={`absolute left-0 top-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500 ease-in-out`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>

                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-4 transition-all duration-300 z-10
                        ${step >= s
                        ? 'bg-blue-600 text-white border-white shadow-md scale-110'
                        : 'bg-white text-slate-400 border-slate-100'}
                    `}>
                      {s === 3 && step === 3 ? <CheckCircle2 className="h-5 w-5" /> : s}
                    </div>
                    {s < 3 && <div className="w-16 md:w-24"></div>} {/* Spacer */}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between w-64 md:w-80 mx-auto text-xs font-semibold text-slate-500 mt-2 text-center pl-2">
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
                  <Label className="text-slate-700 font-semibold">{t.villageName}</Label>
                  <Input
                    value={formData.village_name}
                    onChange={e => setFormData({ ...formData, village_name: e.target.value })}
                    placeholder={t.villageNamePlaceholder}
                    className="h-11 bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold">{t.illnessQuestion}</Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="illness" className="w-5 h-5 text-blue-600" checked={formData.hasIllness} onChange={() => setFormData({ ...formData, hasIllness: true })} />
                      <span className="font-medium">{t.yes}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="illness" className="w-5 h-5 text-blue-600" checked={!formData.hasIllness} onChange={() => setFormData({ ...formData, hasIllness: false })} />
                      <span className="font-medium">{t.no}</span>
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
                                      group relative p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 h-32
                                      hover:shadow-md hover:-translate-y-1
                                      ${formData.symptoms.includes(s.id)
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 shadow-md ring-2 ring-blue-500/20'
                              : 'border-slate-100 bg-white text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                            }
                                   `}
                        >
                          {formData.symptoms.includes(s.id) && (
                            <div className="absolute top-2 right-2 text-blue-600 animate-in zoom-in spin-in-90 duration-300">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                          <div className={`p-3 rounded-full transition-colors duration-300 ${formData.symptoms.includes(s.id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-blue-500 group-hover:shadow-sm'}`}>
                            {/* Icon placeholder logic */}
                            <Activity className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold leading-tight">{t[('syp_' + s.id) as keyof typeof t] || s.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label>{t.otherSymptom}</Label>
                      <Input
                        value={formData.otherSymptom}
                        onChange={e => setFormData({ ...formData, otherSymptom: e.target.value })}
                        placeholder={t.otherSymptomPlaceholder}
                        className="h-11 bg-slate-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t.peopleAffected}</Label>
                      <Input
                        type="number"
                        value={formData.peopleAffected}
                        onChange={e => setFormData({ ...formData, peopleAffected: parseInt(e.target.value) || 1 })}
                        className="h-11 bg-slate-50"
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

                <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between mt-6">
                  <div className="flex items-center gap-3 text-slate-600 font-medium">
                    <MapPin className="h-5 w-5 text-blue-500" /> Include My Location
                  </div>
                  <Button variant="outline" size="sm">Send My Location</Button>
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

          {reports.map((report) => (
            <Card key={report.id} className="group bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-indigo-900/5 overflow-hidden mb-6 rounded-2xl ring-1 ring-slate-100 hover:ring-blue-200 transition-all duration-300">
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 uppercase">
                      {report.village_name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-slate-800">{report.village_name}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                        {new Date(report.created_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`
                           px-4 py-1.5 font-bold rounded-full border-0 shadow-sm
                           ${(report.disease_risk_level || "").includes("High")
                      ? "bg-red-50 text-red-600 ring-1 ring-red-100"
                      : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"}
                        `}>
                    {report.disease_risk_level || report.alert_level || "Moderate Risk"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* Health Worker Advice (Top Priority) */}
                  {report.health_advice && report.health_advice !== "No specific microorganisms detected based on current data." && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="bg-amber-100 p-2 rounded-full text-amber-600 mt-0.5">
                          <MessageSquarePlus className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide mb-1">{t.healthTipsTitle || "Health Worker Message"}</h4>
                          <p className="text-slate-800 text-base font-medium leading-relaxed whitespace-pre-wrap">
                            {report.health_advice}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disease Alert */}
                  {report.predicted_disease && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                      <div className="flex items-center gap-2 font-bold text-blue-700 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        {t.diseaseRisk}: {t[('dis_' + getDiseaseKey(report.predicted_disease)) as keyof typeof t] || report.predicted_disease}
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-1">{t.diseaseRisk}: {report.disease_risk_level}</p>
                    </div>
                  )}

                  {/* Water Biology Alert */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2">
                    <div className="flex items-center gap-2 font-bold text-green-700 mb-2">
                      <Droplets className="h-5 w-5" />
                      {t.waterQuality} Analysis
                    </div>
                    <p className="text-sm text-slate-700 font-medium mb-1">
                      {t.possibleOrganism} {report.possible_organism || t.org_low_microbial}
                    </p>
                    <p className="text-sm text-slate-600 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                      {t.risk_safe}: {t.bio_safe_body}
                    </p>
                  </div>



                  {/* Disease Advice (Automated) */}
                  {report.disease_advice && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 mt-2">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wide mb-1">{t.viewAdvice || "Medical Advice"}</h4>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {t[('adv_' + getDiseaseKey(report.predicted_disease)) as keyof typeof t] || report.disease_advice}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-600">
                  <div className="font-medium">{t.selectSymptoms}: <span className="text-slate-500">{report.symptoms?.map((s: string) => t[('syp_' + s) as keyof typeof t] || s).join(", ") || "None"}</span></div>
                  <div className="font-medium">{t.phLevel}: <span className="text-slate-900">{report.water_ph}</span></div>
                  <div className="font-medium">{t.turbidity}: <span className="text-slate-900">{report.water_turbidity}</span></div>

                  <div className="ml-auto">
                    <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {t.waterQuality}: {t.risk_safe}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 border-slate-200">
                    <Trash2 className="h-4 w-4 mr-2" /> {t.delete}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
};

export default VillagerDashboard;
