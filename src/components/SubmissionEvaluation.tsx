import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface CriteriaScore {
  id: string;
  score: number;
  feedback: string;
}

interface JudgingCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

const JUDGING_CRITERIA: JudgingCriteria[] = [
  {
    id: "technical",
    name: "Technical Excellence",
    description: "Code quality, architecture, and technical implementation",
    maxScore: 10
  },
  {
    id: "innovation",
    name: "Innovation & Creativity",
    description: "Uniqueness and creativity of the solution",
    maxScore: 10
  },
  {
    id: "impact",
    name: "Impact & Practicality",
    description: "Real-world applicability and potential impact",
    maxScore: 10
  },
  {
    id: "presentation",
    name: "Presentation & Documentation",
    description: "Quality of presentation, documentation, and code comments",
    maxScore: 10
  },
  {
    id: "completion",
    name: "Completion & Polish",
    description: "Overall completion, polish, and attention to detail",
    maxScore: 10
  }
];

export function SubmissionEvaluation() {
  const [scores, setScores] = useState<CriteriaScore[]>([]);
  const [saving, setSaving] = useState(false);

  const handleScoreChange = (criteriaId: string, newScore: number) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.id === criteriaId);
      if (existing) {
        return prev.map((s) =>
          s.id === criteriaId ? { ...s, score: newScore } : s
        );
      }
      return [...prev, { id: criteriaId, score: newScore, feedback: "" }];
    });
  };

  const handleFeedbackChange = (criteriaId: string, feedback: string) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.id === criteriaId);
      if (existing) {
        return prev.map((s) =>
          s.id === criteriaId ? { ...s, feedback } : s
        );
      }
      return [...prev, { id: criteriaId, score: 0, feedback }];
    });
  };

  const getTotalScore = () => {
    return scores.reduce((sum, score) => sum + score.score, 0);
  };

  const getMaxPossibleScore = () => {
    return JUDGING_CRITERIA.reduce((sum, criteria) => sum + criteria.maxScore, 0);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Here you would submit to your backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      alert("Evaluation submitted successfully!");
    } catch (error) {
      console.error("Error submitting evaluation:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>Project Evaluation</CardTitle>
          <CardDescription>
            Evaluate each criterion on a scale of 0-10
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Criteria Cards */}
      <div className="space-y-6">
        {JUDGING_CRITERIA.map((criteria) => {
          const currentScore = scores.find((s) => s.id === criteria.id)?.score ?? 0;
          const feedback = scores.find((s) => s.id === criteria.id)?.feedback ?? "";

          return (
            <Card key={criteria.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{criteria.name}</CardTitle>
                    <CardDescription>{criteria.description}</CardDescription>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {currentScore}/{criteria.maxScore}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[currentScore]}
                    onValueChange={([value]) => handleScoreChange(criteria.id, value)}
                    max={criteria.maxScore}
                    step={0.5}
                    className="flex-1"
                  />
                </div>
                <Textarea
                  placeholder="Add your feedback for this criterion (optional)"
                  value={feedback}
                  onChange={(e) => handleFeedbackChange(criteria.id, e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary and Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold">Total Score</div>
              <div className="text-2xl font-bold text-primary">
                {getTotalScore()}/{getMaxPossibleScore()}
              </div>
            </div>
            <Alert>
              <AlertDescription>
                Make sure you've reviewed all criteria carefully before submitting. This action cannot be undone.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSubmit} 
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Submit Evaluation"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}