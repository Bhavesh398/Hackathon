import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Code, Layout, Sparkles, Monitor, Gauge } from "lucide-react";

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
  icon: JSX.Element;
}

// Frontend-specific judging criteria
const JUDGING_CRITERIA: JudgingCriteria[] = [
  {
    id: "ui-design",
    name: "UI Design & Aesthetics",
    description: "Visual appeal, color harmony, typography, and modern design principles",
    maxScore: 10,
    icon: <Layout className="h-5 w-5" />
  },
  {
    id: "ux",
    name: "User Experience & Navigation",
    description: "Intuitive navigation, user flow, and interaction design",
    maxScore: 10,
    icon: <Monitor className="h-5 w-5" />
  },
  {
    id: "responsive",
    name: "Responsive Design",
    description: "Adaptation to different screen sizes and devices, mobile-first approach",
    maxScore: 10,
    icon: <Gauge className="h-5 w-5" />
  },
  {
    id: "code-quality",
    name: "Frontend Code Quality",
    description: "Component structure, React best practices, and code organization",
    maxScore: 10,
    icon: <Code className="h-5 w-5" />
  },
  {
    id: "innovation",
    name: "Innovation & Features",
    description: "Creative UI elements, animations, and unique frontend features",
    maxScore: 10,
    icon: <Sparkles className="h-5 w-5" />
  }
];

const SUBMISSION = {
  id: "1",
  title: "Modern E-commerce Dashboard",
  team: "Frontend Masters",
  description: "A responsive e-commerce dashboard featuring real-time analytics, dynamic charts, and a modern UI built with React and Tailwind CSS. Includes dark mode, responsive layouts, and smooth animations.",
  githubUrl: "https://github.com/example/dashboard",
  demoUrl: "https://example.com/demo",
  techStack: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui"]
};

const JudgeEventAccess = () => {
  const [scores, setScores] = useState<CriteriaScore[]>([]);
  const [saving, setSaving] = useState(false);
  const [isJudgingOpen, setIsJudgingOpen] = useState(false);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Frontend evaluation submitted successfully!");
    } catch (error) {
      console.error("Error submitting evaluation:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Hackathon Card */}
      <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setIsJudgingOpen(!isJudgingOpen)}>
        <CardHeader>
          <CardTitle className="text-3xl">Innovex Hackathon 2025</CardTitle>
          <CardDescription>Click to access judging interface</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Annual innovation hackathon showcasing the best frontend development talent.
          </p>
        </CardContent>
      </Card>

      {isJudgingOpen && (
        <>
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
          <div className="flex flex-col gap-4">
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
            <div className="flex gap-2 flex-wrap">
              {SUBMISSION.techStack.map((tech) => (
                <span key={tech} className="text-xs bg-secondary px-2 py-1 rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frontend Judging Criteria */}
      <div className="space-y-6">
        {JUDGING_CRITERIA.map((criteria) => {
          const currentScore = scores.find((s) => s.id === criteria.id)?.score ?? 0;
          const feedback = scores.find((s) => s.id === criteria.id)?.feedback ?? "";

          return (
            <Card key={criteria.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {criteria.icon}
                    <div>
                      <CardTitle className="text-lg">{criteria.name}</CardTitle>
                      <CardDescription>{criteria.description}</CardDescription>
                    </div>
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
              <div className="text-lg font-semibold">Total Frontend Score</div>
              <div className="text-2xl font-bold text-primary">
                {getTotalScore()}/{getMaxPossibleScore()}
              </div>
            </div>
            <Alert>
              <AlertDescription>
                Please ensure you&apos;ve reviewed all frontend aspects thoroughly before submitting your evaluation.
              </AlertDescription>
            </Alert>
            <Button 
              className="w-full" 
              onClick={handleSubmit} 
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Submit Frontend Evaluation"}
            </Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
};

export default JudgeEventAccess;