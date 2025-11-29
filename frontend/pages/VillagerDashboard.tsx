import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogOut, Droplets, ThermometerSun, Activity, AlertTriangle, CheckCircle2, Info, MessageSquare, Upload, Camera, Trash2, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAutoAdvice } from "@/utils/adviceTemplates";
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
  water_image_url?: string;
  symptoms?: string[];
  people_affected?: number;
  predicted_disease?: string;
  disease_risk_level?: string;
  disease_advice?: string;
  possible_organism?: string;
  health_advice?: string;
  created_at?: string;
}

const VillagerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [villageAdvice, setVillageAdvice] = useState<any[]>([]);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageValidated, setImageValidated] = useState(false);
  const [formData, setFormData] = useState({
    village_name: "",
    water_ph: 7.0,
    water_turbidity: 1.0,
  });
  const [hasIllness, setHasIllness] = useState<boolean>(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [peopleAffected, setPeopleAffected] = useState<number>(1);
  const [otherSymptom, setOtherSymptom] = useState<string>("");
  const [diseasePreview, setDiseasePreview] = useState<{
    disease: string;
    riskLevel: string;
    advice: string;
  } | null>(null);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    fetchCurrentUser();
    fetchMyReports();
    fetchVillageAdvice();
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackendStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/health');
      if (res.ok) setBackendStatus('online');
      else setBackendStatus('offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchMyReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("health_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) setReports(data);
  };

  const fetchVillageAdvice = async () => {
    const { data } = await supabase
      .from("village_advice")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setVillageAdvice(data);
  };

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const predictDisease = async (selectedSymptoms: string[]) => {
    if (selectedSymptoms.length === 0 && !otherSymptom) return null;

    try {
      const allSymptoms = otherSymptom
        ? [...selectedSymptoms, `other: ${otherSymptom}`]
        : selectedSymptoms;

      const { data: response, error } = await supabase.functions.invoke('predict-disease', {
        body: { symptoms: allSymptoms }
      });

      if (error) throw error;
      console.log('Raw API Response (JSON):', JSON.stringify(response, null, 2));

      if (!response || (response.success === false)) {
        throw new Error(response?.error || 'Prediction failed');
      }

      // The backend returns flat data: { predicted_disease, risk_level, ... }
      // But we also handle nested { prediction: ... } just in case of version mismatch
      const data = response.prediction || response;

      console.log('Parsed Prediction Data Keys:', Object.keys(data));

      return {
        disease: data.predicted_disease || data.disease || "Unknown Disease",
        riskLevel: data.risk_level || data.riskLevel || "Moderate",
        advice: data.advice || "Please consult a doctor.",
        confidence: data.confidence || 0
      };
    } catch (error) {
      console.error('Disease prediction error:', error);
      return {
        disease: "Unable to Predict",
        riskLevel: "Moderate",
        advice: "⚠️ Please consult with a health worker for proper diagnosis.",
        confidence: 0.5,
      };
    }
  };

  const predictMicroorganisms = async (data: typeof formData, selectedSymptoms: string[]) => {
    try {
      const allSymptoms = otherSymptom
        ? [...selectedSymptoms, `other: ${otherSymptom}`]
        : selectedSymptoms;

      const { data: response, error } = await supabase.functions.invoke('predict-microorganisms', {
        body: {
          symptoms: allSymptoms,
          pH: data.water_ph,
          turbidity: data.water_turbidity
        }
      });

      if (error) throw error;
      return response;
    } catch (error) {
      console.error('Microorganism prediction error:', error);
      return null;
    }
  };

  const predictRisk = async (data: typeof formData, diseasePrediction: any = null) => {
    try {
      const { data: prediction, error } = await supabase.functions.invoke('predict-risk', {
        body: {
          fever: symptoms.includes('fever') ? peopleAffected : 0,
          diarrhea: symptoms.includes('diarrhea') ? peopleAffected : 0,
          vomiting: symptoms.includes('vomiting') ? peopleAffected : 0,
          pH: data.water_ph,
          turbidity: data.water_turbidity,
          predictedDisease: diseasePrediction?.disease || 'None',
          people_affected: peopleAffected,
        }
      });

      if (error) throw error;
      return prediction;
    } catch (error) {
      console.error('Prediction error:', error);
      // Fallback to simple logic
      if (symptoms.length > 3 && data.water_ph < 6.5) {
        return {
          alert_level: "high",
          alert_message: "⚠️ High Risk of Water-Borne Disease",
        };
      }
      return {
        alert_level: "safe",
        alert_message: "✅ Safe Zone",
      };
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Reset validation status when new image is uploaded
    setImageValidated(false);
    setUploadedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze image (includes validation)
    await analyzeImage(file);
  };

  const analyzeImage = async (file: File) => {
    setAnalyzingImage(true);

    try {
      // Upload to Supabase Storage
      const fileName = `${userId}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('water-samples')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('water-samples')
        .getPublicUrl(fileName);

      // Analyze with AI (includes validation)
      // Analyze with local Python service (OpenCV)
      console.log("Calling local OpenCV service...");
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      if (!response.ok) {
        setImageValidated(false);
        const errorData = await response.json().catch(() => ({}));

        // Show validation error message
        toast({
          title: "Invalid Image",
          description: errorData.message || "Image rejected. Please upload a clear water sample.",
          variant: "destructive",
        });
        return;
      }

      const analysis = await response.json();

      if (analysis.status === 'success') {
        setImageValidated(true);
        setFormData(prev => ({
          ...prev,
          water_ph: analysis.estimated_ph,
          water_turbidity: analysis.estimated_turbidity,
        }));

        toast({
          title: "Image analyzed successfully!",
          description: `${analysis.message} (pH: ${analysis.estimated_ph}, Turbidity: ${analysis.estimated_turbidity} NTU)`,
        });
      } else {
        setImageValidated(false);
        throw new Error(analysis.message || "Analysis failed");
      }
    } catch (error: any) {
      console.error('Image analysis error:', error);
      // Clear the uploaded image and preview on error
      setUploadedImage(null);
      setImagePreview(null);
      setImageValidated(false);

      if (error.message && error.message.includes("Failed to fetch")) {
        toast({
          title: "Connection Error",
          description: "Could not connect to analysis service. Please ensure the backend is running locally.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Image analysis failed",
          description: error.message || "Please enter water quality values manually. Ensure image is clear water in a white cup.",
          variant: "destructive",
        });
      }
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate image if uploaded - ensure it was successfully validated
    if (uploadedImage && imagePreview) {
      // If image hasn't been validated, prevent submission
      if (!imageValidated) {
        setLoading(false);
        toast({
          title: "Invalid Image",
          description: "Image is not a valid water sample. Report not submitted. Please upload a photo of water in a white cup/bottle.",
          variant: "destructive",
        });
        return;
      }
    }

    // Get disease prediction if symptoms are present
    let diseasePrediction = null;
    if (hasIllness && symptoms.length > 0) {
      diseasePrediction = await predictDisease(symptoms);
    }

    // Get microorganism prediction
    let microorganismPrediction = null;
    if (hasIllness || formData.water_ph < 6.5 || formData.water_turbidity > 2) {
      microorganismPrediction = await predictMicroorganisms(formData, symptoms);
    }

    // Get risk prediction based on water quality, symptoms, AND predicted disease
    const prediction = await predictRisk(formData, diseasePrediction);

    const allSymptoms = otherSymptom
      ? [...symptoms, `other: ${otherSymptom}`]
      : symptoms;

    const reportData: any = {
      user_id: userId,
      reporter_name: "Villager",
      reporter_role: "villager", // Fixed: Lowercase to match database constraint
      district: "Unknown",
      ...formData,
      fever_cases: symptoms.includes('fever') ? peopleAffected : 0,
      diarrhea_cases: symptoms.includes('diarrhea') ? peopleAffected : 0,
      vomiting_cases: symptoms.includes('vomiting') ? peopleAffected : 0,
      symptoms: hasIllness ? allSymptoms : [],
      people_affected: hasIllness ? peopleAffected : 0,
      predicted_disease: diseasePrediction?.disease || null,
      disease_risk_level: diseasePrediction?.riskLevel || null,
      disease_advice: diseasePrediction?.advice || null,
      alert_level: prediction.alert_level,
      alert_message: prediction.alert_message,
      possible_organism: microorganismPrediction?.microorganisms?.join(", ") || prediction.possible_organism || null,
      health_advice: microorganismPrediction?.message || prediction.health_advice || null,
    };

    // Add location if enabled
    if (locationEnabled && currentLocation) {
      reportData.latitude = currentLocation.lat;
      reportData.longitude = currentLocation.lng;
      reportData.location_timestamp = new Date().toISOString();
    }

    // Add image URL if uploaded (image is already validated at this point)
    if (uploadedImage && imagePreview) {
      const fileName = `${userId}_${Date.now()}_${uploadedImage.name}`;
      const { data: uploadData } = await supabase.storage
        .from('water-samples')
        .upload(fileName, uploadedImage);

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('water-samples')
          .getPublicUrl(fileName);
        reportData.water_image_url = publicUrl;
      }
    }

    let { error } = await supabase.from("health_reports").insert(reportData);

    setLoading(false);

    if (error) {
      const message = error.message || "";
      const schemaColumnMissing =
        message.includes("health_advice") ||
        message.includes("possible_organism") ||
        message.includes("schema cache");

      if (schemaColumnMissing) {
        // Retry without new columns so submission still succeeds before migration is applied
        const { possible_organism, health_advice, ...fallbackData } = reportData;
        const retry = await supabase.from("health_reports").insert(fallbackData);
        if (retry.error) {
          toast({
            title: "Error submitting report",
            description: retry.error.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Report submitted (without biology info)",
          description:
            "Database migration not applied yet. Please run the migration to store Possible Organism and Health Advice.",
        });
        fetchMyReports();
        // Reset form
        setFormData({
          village_name: "",
          water_ph: 7.0,
          water_turbidity: 1.0,
        });
        setHasIllness(false);
        setSymptoms([]);
        setPeopleAffected(1);
        setOtherSymptom("");
        setDiseasePreview(null);
        setUploadedImage(null);
        setImagePreview(null);
        setImageValidated(false);
        setLocationEnabled(false);
        setCurrentLocation(null);
        return;
      } else {
        toast({
          title: "Error submitting report",
          description: message,
          variant: "destructive",
        });
      }
    } else {
      let description = prediction.alert_message;
      if (diseasePrediction) {
        description = `${diseasePrediction.disease} (${diseasePrediction.risk_level} Risk)\n\n${diseasePrediction.advice}`;
      }

      toast({
        title: "Report submitted successfully!",
        description: description,
        variant: diseasePrediction?.risk_level === "High" || prediction.alert_level === "high" ? "destructive" : "default",
      });
      fetchMyReports();
      // Reset form
      setFormData({
        village_name: "",
        water_ph: 7.0,
        water_turbidity: 1.0,
      });
      setHasIllness(false);
      setSymptoms([]);
      setPeopleAffected(1);
      setOtherSymptom("");
      setDiseasePreview(null);
      setUploadedImage(null);
      setImagePreview(null);
      setImageValidated(false);
      setLocationEnabled(false);
      setCurrentLocation(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteReport = (reportId: string) => {
    setDeleteReportId(reportId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteReport = async () => {
    if (!deleteReportId || !userId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("health_reports")
        .delete()
        .eq("id", deleteReportId)
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Error deleting report",
          description: error.message || "Failed to delete your report. Please try again.",
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }

      toast({
        title: "Report deleted",
        description: "Your report has been removed successfully.",
      });
      await fetchMyReports();
      setShowDeleteDialog(false);
      setDeleteReportId(null);
    } catch (err: any) {
      toast({
        title: "Error deleting report",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationEnabled(true);
        setLoading(false);
        toast({
          title: "Location captured",
          description: "Your location will be included in the report",
        });
      },
      (error) => {
        setLoading(false);
        toast({
          title: "Location error",
          description: "Unable to get your location. Please try again.",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <header className="border-b bg-gradient-to-r from-card via-card to-primary/5 shadow-medical sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-medical-text">VillagerDashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Report Your Health Data & Water Quality</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2 shadow-sm hover:shadow-md transition-all">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Backend Status Alert */}
        {backendStatus === 'offline' && (
          <Alert className="mb-4 border-red-500 bg-red-50 animate-fade-in">
            <WifiOff className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 font-semibold">Analysis Service Offline</AlertTitle>
            <AlertDescription className="text-red-700">
              The water analysis service is not connected. Please ensure the backend is running locally.
              <br />
              <span className="text-xs font-mono bg-red-100 px-1 rounded">npm run start:backend</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Health Tips */}
        <Alert className="mb-8 border-secondary/50 bg-gradient-to-r from-secondary/10 to-secondary/5 shadow-medical animate-fade-in">
          <Info className="h-5 w-5 text-secondary" />
          <AlertTitle className="text-secondary text-lg font-semibold">Health Tips for Safe Living</AlertTitle>
          <AlertDescription>
            <ul className="mt-3 list-disc list-inside space-y-2 text-sm">
              <li>Always boil drinking water for at least 20 minutes</li>
              <li>Wash hands regularly with soap before eating</li>
              <li>Maintain proper sanitation around your home</li>
              <li>Report any unusual symptoms immediately</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Data Entry Form */}
        <Card className="mb-8 shadow-medical-lg border-primary/20 card-hover animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              Submit Health & Water Quality Report
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the health data and water quality information for your village
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="village_name">Village Name *</Label>
                <Input
                  id="village_name"
                  value={formData.village_name}
                  onChange={(e) => setFormData({ ...formData, village_name: e.target.value })}
                  required
                  placeholder="Enter your village name"
                />
              </div>

              {/* Illness Section */}
              <div className="border rounded-lg p-4 space-y-4 bg-card">
                <Label className="text-base font-semibold">Any illness observed in the last 7 days?</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasIllness"
                      checked={hasIllness === true}
                      onChange={() => setHasIllness(true)}
                      className="w-4 h-4"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasIllness"
                      checked={hasIllness === false}
                      onChange={() => {
                        setHasIllness(false);
                        setSymptoms([]);
                        setPeopleAffected(1);
                        setOtherSymptom("");
                      }}
                      className="w-4 h-4"
                    />
                    <span>No</span>
                  </label>
                </div>

                {hasIllness && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label className="text-base font-semibold mb-3 block">Select all symptoms you've noticed:</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { id: "diarrhea", label: "Frequent loose motion (diarrhea)" },
                          { id: "vomiting", label: "Vomiting" },
                          { id: "fever", label: "High fever" },
                          { id: "stomach_pain", label: "Stomach or abdominal pain" },
                          { id: "nausea", label: "Nausea / loss of appetite", alt: "loss_appetite" },
                          { id: "weakness", label: "Weakness / tiredness" },
                          { id: "headache", label: "Headache" },
                          { id: "jaundice", label: "Yellow eyes or skin (Jaundice)" },
                          { id: "dark_urine", label: "Dark yellow urine" },
                          { id: "dehydration", label: "Dehydration (dry mouth, less urination)" },
                          { id: "rash", label: "Itchy skin / rashes" },
                          { id: "body_pain", label: "Body pain" },
                          { id: "swelling", label: "Swelling in legs or abdomen" },
                          { id: "blood_stool", label: "Blood in stool" },
                          { id: "cough", label: "Persistent cough" },
                        ].map((symptom) => (
                          <label key={symptom.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={symptoms.includes(symptom.alt || symptom.id)}
                              onChange={() => toggleSymptom(symptom.alt || symptom.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{symptom.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="other_symptom">Other (please specify):</Label>
                      <Input
                        id="other_symptom"
                        placeholder="Describe any other symptoms..."
                        value={otherSymptom}
                        onChange={(e) => setOtherSymptom(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="people_affected">How many people are affected?</Label>
                      <Input
                        id="people_affected"
                        type="number"
                        min="1"
                        max="100"
                        value={peopleAffected}
                        onChange={(e) => setPeopleAffected(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    {symptoms.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const prediction = await predictDisease(symptoms);
                          setDiseasePreview(prediction);
                        }}
                        className="w-full"
                      >
                        Preview Disease Prediction
                      </Button>
                    )}

                    {diseasePreview && (
                      <Alert className={
                        (diseasePreview.riskLevel === "High" || diseasePreview.riskLevel === "Severe" || diseasePreview.riskLevel === "Critical") ? "border-red-500 bg-red-50" :
                          diseasePreview.riskLevel === "Moderate" ? "border-blue-500 bg-blue-50" :
                            "border-green-500 bg-green-50"
                      }>
                        <AlertTriangle className={
                          (diseasePreview.riskLevel === "High" || diseasePreview.riskLevel === "Severe" || diseasePreview.riskLevel === "Critical") ? "h-5 w-5 text-red-600" :
                            diseasePreview.riskLevel === "Moderate" ? "h-5 w-5 text-blue-600" :
                              "h-5 w-5 text-green-600"
                        } />
                        <AlertTitle className={`text-base font-bold ${(diseasePreview.riskLevel === "High" || diseasePreview.riskLevel === "Severe" || diseasePreview.riskLevel === "Critical") ? "text-red-700" :
                          diseasePreview.riskLevel === "Moderate" ? "text-blue-700" :
                            "text-green-700"
                          }`}>
                          🧾 Possible Disease: {diseasePreview.disease} ({diseasePreview.riskLevel} Risk)
                        </AlertTitle>
                        <AlertDescription className="text-sm mt-2 text-foreground/80">
                          {diseasePreview.advice}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              {/* Water Sample Image Upload */}
              <div className="border rounded-lg p-4 space-y-3 bg-primary/5">
                <Label className="flex items-center gap-2 text-base">
                  <Camera className="h-5 w-5 text-primary" />
                  Upload Water Sample Photo
                </Label>
                <div className="bg-white p-3 rounded border border-primary/20">
                  <p className="text-sm font-semibold text-primary mb-2">📸 Photo Tips for Accurate Results:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Consistent lighting</strong>: Use indoor light or flashlight</li>
                    <li><strong>White background</strong>: Place sample on white paper</li>
                    <li><strong>Avoid shadows</strong>: No direct sunlight or reflections</li>
                    <li><strong>Steady shot</strong>: Keep camera close and stable</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Our AI will automatically extract pH and turbidity values from your photo.
                </p>

                <div className="flex items-center gap-4">
                  <Label htmlFor="water_image" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploadedImage ? "Change Photo" : "Choose Photo"}
                    </div>
                    <Input
                      id="water_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </Label>

                  {analyzingImage && (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      🤖 Analyzing image...
                    </p>
                  )}
                </div>

                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Water sample preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-primary/20"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="water_ph" className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    Water pH Level {uploadedImage && "(AI-extracted)"}
                  </Label>
                  <Input
                    id="water_ph"
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={formData.water_ph}
                    onChange={(e) => setFormData({ ...formData, water_ph: parseFloat(e.target.value) || 7.0 })}
                    required
                    disabled={analyzingImage}
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadedImage ? "Auto-detected from image" : "Normal range: 6.5 - 8.5"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="water_turbidity">
                    Water Turbidity (NTU) {uploadedImage && "(AI-extracted)"}
                  </Label>
                  <Input
                    id="water_turbidity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.water_turbidity}
                    onChange={(e) => setFormData({ ...formData, water_turbidity: parseFloat(e.target.value) || 1.0 })}
                    required
                    disabled={analyzingImage}
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadedImage ? "Auto-detected from image" : "Lower is better (<5 NTU)"}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Include My Location
                  </Label>
                  <Button
                    type="button"
                    variant={locationEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={handleGetLocation}
                    disabled={loading}
                  >
                    {locationEnabled ? "✓ Location Captured" : "Send My Location"}
                  </Button>
                </div>
                {locationEnabled && currentLocation && (
                  <p className="text-xs text-muted-foreground">
                    📍 Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Sharing your location helps health workers provide better emergency response
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 h-12 text-base font-medium shadow-md hover:shadow-lg transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Submitting...
                  </span>
                ) : (
                  "Submit Health Report"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Health Worker Advice Section */}
        {villageAdvice.length > 0 && (
          <Card className="mb-8 shadow-medical-lg border-primary/20 animate-fade-in">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                Health Worker Advice for Your Villages
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Safety suggestions and guidance from health workers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {villageAdvice.map((advice) => {
                  const borderColor =
                    advice.risk_level === "high"
                      ? "border-l-destructive"
                      : advice.risk_level === "moderate"
                        ? "border-l-warning"
                        : "border-l-success";

                  return (
                    <div
                      key={advice.id}
                      className={`border-l-4 ${borderColor} bg-card p-4 rounded-r-lg space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">{advice.village_name}</h4>
                        <Badge
                          variant={advice.risk_level === "high" ? "destructive" : "default"}
                          className={
                            advice.risk_level === "moderate"
                              ? "bg-warning text-warning-foreground"
                              : advice.risk_level === "safe"
                                ? "bg-success"
                                : ""
                          }
                        >
                          {advice.risk_level.toUpperCase()} RISK
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Safety Guidelines:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {(advice.auto_advice || getAutoAdvice(advice.risk_level)).map(
                            (tip: string, idx: number) => (
                              <li key={idx}>{tip}</li>
                            )
                          )}
                        </ul>
                      </div>

                      {advice.custom_advice && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Additional Instructions from Health Worker</AlertTitle>
                          <AlertDescription>{advice.custom_advice}</AlertDescription>
                        </Alert>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(advice.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reports */}
        <Card className="shadow-medical-lg border-primary/20 animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
            <CardTitle className="text-xl">Your Recent Reports</CardTitle>
            <CardDescription className="text-base mt-1">Last 5 health reports you submitted</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reports submitted yet</p>
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
                  return (
                    <div key={report.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{report.village_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.report_date || report.created_at || new Date()).toLocaleDateString()}
                          </p>
                        </div>
                        {report.disease_risk_level ? (
                          <Badge
                            variant="outline"
                            className={`gap-1 ${(report.disease_risk_level === "High" || report.disease_risk_level === "Severe" || report.disease_risk_level === "Critical") ? "border-red-500 text-red-700 bg-red-50" :
                              report.disease_risk_level === "Moderate" ? "border-blue-500 text-blue-700 bg-blue-50" :
                                "border-green-500 text-green-700 bg-green-50"
                              }`}
                          >
                            {(report.disease_risk_level === "High" || report.disease_risk_level === "Severe" || report.disease_risk_level === "Critical") && <AlertTriangle className="h-3 w-3 text-red-600" />}
                            {report.disease_risk_level === "Moderate" && <Info className="h-3 w-3 text-blue-600" />}
                            {(report.disease_risk_level === "Low" || report.disease_risk_level === "Safe") && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                            {report.disease_risk_level} Risk
                          </Badge>
                        ) : (
                          <Badge className="bg-success gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            No Symptoms Reported
                          </Badge>
                        )}
                      </div>

                      {report.predicted_disease ? (
                        <Alert className={
                          (report.disease_risk_level === "High" || report.disease_risk_level === "Severe" || report.disease_risk_level === "Critical") ? "border-red-500 bg-red-50" :
                            report.disease_risk_level === "Moderate" ? "border-blue-500 bg-blue-50" :
                              "border-green-500 bg-green-50"
                        }>
                          <AlertTriangle className={
                            (report.disease_risk_level === "High" || report.disease_risk_level === "Severe" || report.disease_risk_level === "Critical") ? "h-4 w-4 text-red-600" :
                              report.disease_risk_level === "Moderate" ? "h-4 w-4 text-blue-600" :
                                "h-4 w-4 text-green-600"
                          } />
                          <AlertTitle className={`text-sm font-semibold ${(report.disease_risk_level === "High" || report.disease_risk_level === "Severe" || report.disease_risk_level === "Critical") ? "text-red-700" :
                            report.disease_risk_level === "Moderate" ? "text-blue-700" :
                              "text-green-700"
                            }`}>
                            🩺 Predicted Disease: {report.predicted_disease}
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1 space-y-1 text-foreground/80">
                            <p className="font-medium">Risk Level: {report.disease_risk_level}</p>
                            <p>{report.disease_advice}</p>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-muted bg-muted/5">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <AlertTitle className="text-sm font-semibold">
                            No Health Issues Detected
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1">
                            Continue maintaining good hygiene and water safety practices.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Water Biology Analysis */}
                      {biology.possible_organism && biology.health_advice && (
                        <Alert className={
                          biology.health_advice.includes("contamination") || biology.health_advice.includes("HIGH RISK") || biology.health_advice.includes("UNSAFE") ? "border-red-500 bg-red-50" :
                            biology.health_advice.includes("MODERATE RISK") || biology.health_advice.includes("CAUTION") ? "border-blue-500 bg-blue-50" :
                              "border-green-500 bg-green-50"
                        }>
                          <Droplets className={
                            biology.health_advice.includes("contamination") || biology.health_advice.includes("HIGH RISK") || biology.health_advice.includes("UNSAFE") ? "h-4 w-4 text-red-600" :
                              biology.health_advice.includes("MODERATE RISK") || biology.health_advice.includes("CAUTION") ? "h-4 w-4 text-blue-600" :
                                "h-4 w-4 text-green-600"
                          } />
                          <AlertTitle className={`text-sm font-semibold ${biology.health_advice.includes("contamination") || biology.health_advice.includes("HIGH RISK") || biology.health_advice.includes("UNSAFE") ? "text-red-700" :
                            biology.health_advice.includes("MODERATE RISK") || biology.health_advice.includes("CAUTION") ? "text-blue-700" :
                              "text-green-700"
                            }`}>
                            🔬 Water Biology Analysis
                          </AlertTitle>
                          <AlertDescription className="text-xs mt-1 space-y-1 text-foreground/80">
                            <p className="font-medium">Possible Organism: {biology.possible_organism}</p>
                            <p className="mt-1">{biology.health_advice}</p>
                          </AlertDescription>
                        </Alert>
                      )}

                      {report.symptoms && report.symptoms.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground font-medium">Symptoms: </span>
                          <span className="text-foreground">{report.symptoms.join(", ")}</span>
                          {report.people_affected && report.people_affected > 1 && (
                            <span className="text-muted-foreground ml-2">({report.people_affected} people affected)</span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm pt-2">
                        <div>
                          <span className="text-muted-foreground">pH:</span> {report.water_ph}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Turbidity:</span> {report.water_turbidity}
                        </div>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(report.id)}
                          className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-muted transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
                <Trash2 className="h-5 w-5" />
                Delete Your Report
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Are you sure you want to delete this report? This action cannot be undone.
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
      </main >
    </div >
  );
};

export default VillagerDashboard;
