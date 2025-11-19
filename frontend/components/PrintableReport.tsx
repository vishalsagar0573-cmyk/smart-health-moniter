import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "lucide-react";

interface PrintableReportProps {
  reports: any[];
  village?: string;
}

export const PrintableReport = ({ reports, village }: PrintableReportProps) => {
  const filteredReports = village
    ? reports.filter((r) => r.village_name === village)
    : reports;

  return (
    <div className="print:p-8 space-y-6">
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-primary">
          Community Health Monitoring Report
        </h1>
        {village && <h2 className="text-xl mt-2">Village: {village}</h2>}
        <p className="text-sm text-muted-foreground mt-2">
          Generated on: {new Date().toLocaleString()}
        </p>
      </div>

      {filteredReports.map((report, index) => (
        <Card key={report.id} className="break-inside-avoid mb-6">
          <CardHeader className="bg-accent/10">
            <CardTitle className="flex items-center justify-between">
              <span>
                Report #{index + 1} - {report.village_name}
              </span>
              {report.disease_risk_level && (
                <span
                  className={`text-sm px-3 py-1 rounded ${
                    report.disease_risk_level === "High"
                      ? "bg-destructive text-destructive-foreground"
                      : report.disease_risk_level === "Moderate"
                      ? "bg-warning text-warning-foreground"
                      : "bg-success text-white"
                  }`}
                >
                  {report.disease_risk_level.toUpperCase()} RISK
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {new Date(report.report_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted By</p>
                <p className="font-semibold">{report.submitter_name || "Unknown"}</p>
              </div>
            </div>

            {report.symptoms && report.symptoms.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <h3 className="font-semibold mb-3">Reported Symptoms</h3>
                <div className="flex flex-wrap gap-2">
                  {report.symptoms.map((symptom: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-muted rounded text-sm">
                      {symptom.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                {report.people_affected && (
                  <p className="text-sm text-muted-foreground mt-2">
                    People Affected: {report.people_affected}
                  </p>
                )}
              </div>
            )}

            {report.predicted_disease && (
              <div className="border-t pt-4 mb-4">
                <h3 className="font-semibold mb-3">ML Prediction</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted Disease</p>
                    <p className="text-xl font-bold">{report.predicted_disease}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Level</p>
                    <p className={`text-xl font-bold ${
                      report.disease_risk_level === "High" ? "text-destructive" :
                      report.disease_risk_level === "Moderate" ? "text-warning" :
                      "text-success"
                    }`}>
                      {report.disease_risk_level || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold mb-3">Water Quality</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">pH Level</p>
                  <p className="text-xl font-bold">{report.water_ph}</p>
                  <p className="text-xs text-muted-foreground">
                    (Normal: 6.5-8.5)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Turbidity (NTU)
                  </p>
                  <p className="text-xl font-bold">{report.water_turbidity}</p>
                  <p className="text-xs text-muted-foreground">
                    (Safe: {"<"}5 NTU)
                  </p>
                </div>
              </div>
            </div>

            {report.possible_organism && report.health_advice && (
              <div className="border-t pt-4 mb-4">
                <h3 className="font-semibold mb-3">Water Biology Analysis</h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Possible Organism: </span>
                    <span className="font-semibold">{report.possible_organism}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Health Advice: </span>
                    {report.health_advice}
                  </p>
                </div>
              </div>
            )}

            {report.latitude && report.longitude && (
              <div className="border-t pt-4 mb-4">
                <h3 className="font-semibold mb-2">Location</h3>
                <p className="text-sm">
                  Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                </p>
              </div>
            )}

          </CardContent>
        </Card>
      ))}

      <div className="print:block hidden border-t pt-4 mt-8 text-center text-sm text-muted-foreground">
        <p>
          This is an official report from the Community Health Monitoring System
        </p>
        <p>For official use only</p>
      </div>
    </div>
  );
};
