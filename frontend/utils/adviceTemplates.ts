export const getAutoAdvice = (riskLevel: string): string[] => {
  const adviceMap: Record<string, string[]> = {
    safe: [
      "Continue regular hygiene practices",
      "Drink boiled or filtered water",
      "Maintain clean water storage containers",
      "Wash hands before meals"
    ],
    moderate: [
      "Clean water tanks weekly",
      "Avoid using open well water",
      "Use chlorine tablets if available",
      "Increase water quality monitoring",
      "Boil water for at least 20 minutes before drinking"
    ],
    high: [
      "⚠️ Immediate water testing needed",
      "Avoid drinking from ponds or lakes",
      "Use only bottled or boiled water",
      "Visit health center if symptoms appear",
      "Report any new cases immediately",
      "Avoid bathing in contaminated water sources"
    ]
  };

  return adviceMap[riskLevel.toLowerCase()] || adviceMap.safe;
};
