import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const SUBMISSION = {
  id: "1",
  title: "AI-Powered Healthcare Assistant",
  team: "InnoHealth",
  description: "An innovative AI solution that helps healthcare providers diagnose conditions more accurately using machine learning and patient historical data.",
  githubUrl: "https://github.com/example/ai-health",
  demoUrl: "https://example.com/demo",
  image: "/healthcare-ai.png"
};

const DemoJudgePanel = () => {
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
      // In a real app, you would submit to your backend here
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Evaluation submitted successfully!");
    } catch (error) {
      console.error("Error submitting evaluation:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Page Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Demo Judge Panel</h1>
        <p className="text-muted-foreground">
          This is a demo of the judging interface. You can try out the scoring system below.
        </p>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{SUBMISSION.title}</CardTitle>
          <CardDescription>
            Submitted by {SUBMISSION.team}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {SUBMISSION.description}
          </p>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a 
                href={SUBMISSION.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Code
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a 
                href={SUBMISSION.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Demo
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Judging Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Judging Instructions</CardTitle>
          <CardDescription>
            Please evaluate each criterion carefully using the sliders below. You can provide optional feedback for each criterion.
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
            <Button 
              className="w-full" 
              onClick={handleSubmit} 
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Submit Evaluation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoJudgePanel;