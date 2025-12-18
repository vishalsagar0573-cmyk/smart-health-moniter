
// Shared analysis logic returning keys
export const getBiologyAnalysis = (
    ph: number | undefined | null,
    turbidity: number | undefined | null,
    symptoms: string[] = []
) => {
    if (ph === undefined || ph === null || turbidity === undefined || turbidity === null) {
        return null;
    }

    if (ph < 0 || ph > 14 || turbidity < 0) {
        return null; // Invalid data
    }

    const organisms: string[] = [];
    const warnings: string[] = [];
    let riskLevel = "Safe";

    // --- 1. Water Quality Based Indicators ---
    if (ph < 5.5) {
        organisms.push("org_fungi", "org_iron_bac");
        warnings.push("warn_acidic");
        riskLevel = "Unsafe";
    } else if (ph >= 5.5 && ph < 6.5) {
        organisms.push("org_sulfur_bac");
        warnings.push("warn_slight_acidic");
        if (riskLevel === "Safe") riskLevel = "Moderate";
    } else if (ph >= 7.6 && ph <= 8.5) {
        organisms.push("org_cyanobac");
        warnings.push("warn_algal");
        if (riskLevel === "Safe") riskLevel = "Moderate";
    } else if (ph > 8.5 && ph <= 9.0) {
        organisms.push("org_sulfate_bac");
        warnings.push("warn_alkaline");
        riskLevel = "Unsafe";
    } else if (ph > 9.0) {
        organisms.push("org_alkaline");
        riskLevel = "Critical";
    }

    if (turbidity > 5) {
        organisms.push("org_ecoli", "org_protozoa");
        warnings.push("warn_high_turbidity");
        if (riskLevel !== "Critical") riskLevel = "High";
    }

    // --- 2. Symptom Based Indicators (Correlation) ---
    // Normalize symptoms to lowercase
    const normSymptoms = symptoms.map(s => s.toLowerCase().replace(/ /g, "_"));

    const hasGI = normSymptoms.some(s => ["diarrhea", "vomiting", "stomach_pain", "nausea", "loose_motion"].includes(s));
    const hasSkin = normSymptoms.some(s => ["rash", "itching", "skin_irritation"].includes(s));
    const hasJaundice = normSymptoms.includes("jaundice") || normSymptoms.includes("yellow_eyes");
    const hasFever = normSymptoms.includes("fever") || normSymptoms.includes("high_fever");
    const hasDarkUrine = normSymptoms.includes("dark_urine");

    if (hasGI) {
        // GI symptoms strongly suggest fecal contamination even if turbidity is low (could be dissolved/viral)
        if (!organisms.includes("org_ecoli")) organisms.push("org_ecoli");
        if (!organisms.includes("org_giardia")) organisms.push("org_giardia");

        // If water parameters looked safe but symptoms exist
        if (riskLevel === "Safe" || riskLevel === "Moderate") {
            organisms.push("org_viruses");
            warnings.push("warn_viral_symptom");
            riskLevel = "High";
        }
    }

    if (hasSkin) {
        if (!organisms.includes("org_cyanobac")) organisms.push("org_cyanobac");
        if (!organisms.includes("org_schistosoma")) organisms.push("org_schistosoma");
        warnings.push("warn_skin");
        if (riskLevel === "Safe") riskLevel = "Moderate";
    }

    if (hasJaundice || hasDarkUrine) {
        organisms.push("org_hep_ae");
        warnings.push("warn_jaundice");
        riskLevel = "High";
    }

    if (hasFever && hasGI) {
        organisms.push("org_salmonella");
        riskLevel = "High";
    }

    const uniqueOrganisms = Array.from(new Set(organisms));

    let advicePrefix = "bio_safe_prefix";
    if (riskLevel === "Moderate") advicePrefix = "bio_mod_prefix";
    else if (riskLevel === "High") advicePrefix = "bio_high_prefix";
    else if (riskLevel === "Unsafe") advicePrefix = "bio_unsafe_prefix";
    else if (riskLevel === "Critical") advicePrefix = "bio_chem_unsafe_prefix";

    return {
        uniqueOrganisms,
        warnings,
        riskLevel,
        advicePrefix
    };
};

export const getPossibleOrganisms = (
    ph: number | undefined | null,
    turbidity: number | undefined | null,
    symptoms: string[] = []
): { possible_organism: string; health_advice: string } => {

    const analysis = getBiologyAnalysis(ph, turbidity, symptoms);

    if (!analysis) {
        // Handle invalid/missing data cases
        if (ph === undefined || ph === null || turbidity === undefined || turbidity === null) {
            return {
                possible_organism: "Not enough data to analyze water biology.",
                health_advice: "Not enough data to analyze water biology."
            };
        } else {
            return {
                possible_organism: "Invalid pH or turbidity value.",
                health_advice: "Invalid values. Please check your measurement."
            };
        }
    }

    const { uniqueOrganisms, warnings, riskLevel } = analysis;

    // --- Legacy string construction for Worker Dashboard (English) ---
    // This maps keys back to English strings roughly
    const keyToEnglish: Record<string, string> = {
        "org_fungi": "Fungi", "org_iron_bac": "Iron Bacteria", "org_sulfur_bac": "Sulfur-Oxidizing Bacteria",
        "org_cyanobac": "Cyanobacteria (Algae)", "org_sulfate_bac": "Sulfate-Reducing Bacteria",
        "org_alkaline": "Extreme Alkaline Conditions", "org_ecoli": "E. coli", "org_protozoa": "Protozoa (Giardia)",
        "org_giardia": "Giardia", "org_viruses": "Viruses (Rotavirus/Norovirus)", "org_schistosoma": "Schistosoma",
        "org_hep_ae": "Hepatitis A/E", "org_salmonella": "Salmonella (Typhoid)",
        "warn_acidic": "Acidic water promotes fungal growth.", "warn_slight_acidic": "Slightly acidic water.",
        "warn_algal": "Algal bloom potential.", "warn_alkaline": "Alkaline water.",
        "warn_high_turbidity": "High turbidity often indicates fecal contamination.",
        "warn_viral_symptom": "Symptoms suggest viral contamination despite clear water.",
        "warn_skin": "Skin reactions suggest contact with algae or parasites.",
        "warn_jaundice": "Jaundice indicates potential Hepatitis contamination."
    };

    if (uniqueOrganisms.length === 0) {
        return {
            possible_organism: "Low Microbial Presence (Safe)",
            health_advice: "✅ SAFE: Water quality appears good with low microbial presence. Continue maintaining good hygiene practices."
        };
    }

    const organismStr = uniqueOrganisms.map(k => keyToEnglish[k] || k).join(", ");
    const warningStr = warnings.map(k => keyToEnglish[k] || k).join(" ");

    let advicePrefix = "✅ SAFE";
    if (riskLevel === "Moderate") advicePrefix = "⚠️ MODERATE RISK";
    else if (riskLevel === "High") advicePrefix = "🔴 HIGH RISK";
    else if (riskLevel === "Unsafe") advicePrefix = "⚠️ UNSAFE";
    else if (riskLevel === "Critical") advicePrefix = "🔴 CHEMICALLY UNSAFE";

    let adviceBody = "";
    if (riskLevel === "Safe") {
        adviceBody = "Water quality appears acceptable. " + warningStr;
    } else {
        adviceBody = `Possible contamination by ${organismStr}. ${warningStr} Boil water for at least 1 minute before drinking. Use filtration if available.`;
    }

    return {
        possible_organism: organismStr,
        health_advice: `${advicePrefix}: ${adviceBody}`
    };
};
