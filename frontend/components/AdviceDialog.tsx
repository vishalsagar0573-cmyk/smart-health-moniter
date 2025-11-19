import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AdviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  villageName: string;
  riskLevel: string;
  autoAdvice: string[];
  existingAdvice?: { id: string; custom_advice: string | null } | null;
  onSuccess: () => void;
}

export const AdviceDialog = ({
  open,
  onOpenChange,
  villageName,
  riskLevel,
  autoAdvice,
  existingAdvice,
  onSuccess,
}: AdviceDialogProps) => {
  const { toast } = useToast();
  const [customAdvice, setCustomAdvice] = useState(existingAdvice?.custom_advice || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add advice",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      if (existingAdvice?.id) {
        // Update existing advice
        const { error } = await supabase
          .from("village_advice")
          .update({ custom_advice: customAdvice })
          .eq("id", existingAdvice.id);

        if (error) throw error;
      } else {
        // Insert new advice
        const { error } = await supabase.from("village_advice").insert({
          village_name: villageName,
          risk_level: riskLevel,
          auto_advice: autoAdvice,
          custom_advice: customAdvice,
          worker_id: user.id,
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Advice saved successfully",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving advice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Safety Advice for {villageName}</DialogTitle>
          <DialogDescription>
            Add custom advice for this village (Risk Level: {riskLevel.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-base font-semibold mb-2">Auto-Generated Advice:</Label>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
              {autoAdvice.map((advice, index) => (
                <li key={index}>{advice}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-advice">Custom Advice (Optional):</Label>
            <Textarea
              id="custom-advice"
              placeholder="Add any additional safety instructions for this village..."
              value={customAdvice}
              onChange={(e) => setCustomAdvice(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Advice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
