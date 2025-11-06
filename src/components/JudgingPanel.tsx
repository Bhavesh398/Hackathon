import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";
import type { JudgingCriterion, Score, Submission } from "@/types/judging";

// Sample criteria - in real app, this would come from your database
const SAMPLE_CRITERIA: JudgingCriterion[] = [
  {
    id: "1",
    criterion: "Innovation & Creativity",
    description: "Uniqueness of the idea and creative problem-solving approach",
    maxScore: 10,
  },
  {
    id: "2",
    criterion: "Technical Implementation",
    description: "Quality of code, architecture, and technical execution",
    maxScore: 10,
  },
  {
    id: "3",
    criterion: "Impact & Practicality",
    description: "Potential impact and practical applicability of the solution",
    maxScore: 10,
  },
  {
    id: "4",
    criterion: "Presentation",
    description: "Quality of presentation, demo, and documentation",
    maxScore: 10,
  },
];

// Sample submission - in real app, this would come from your database
const SAMPLE_SUBMISSION: Submission = {
  id: "1",
  teamName: "Tech Innovators",
  projectTitle: "AI-Powered Smart City Solution",
  description: "A comprehensive smart city management system using AI and IoT",
  submissionUrl: "https://github.com/example/project",
};

export function JudgingPanel() {
  const [scores, setScores] = useState<Score[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<string>("");
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({});

  const handleScoreChange = (criterionId: string, newScore: number) => {
    setScores((prev) => {
      const existing = prev.find((s) => s.criterionId === criterionId);
      if (existing) {
        return prev.map((s) =>
          s.criterionId === criterionId ? { ...s, score: newScore } : s
        );
      }
      return [...prev, { criterionId, score: newScore }];
    });
  };

  const handleFeedbackChange = (criterionId: string, text: string) => {
    setFeedback((prev) => ({ ...prev, [criterionId]: text }));
    setScores((prev) => {
      return prev.map((s) =>
        s.criterionId === criterionId ? { ...s, feedback: text } : s
      );
    });
  };

  const getTotalScore = () => {
    return scores.reduce((sum, score) => sum + score.score, 0);
  };

  const handleSubmit = () => {
    // In a real app, this would send the scores to your backend
    console.log({
      submissionId: SAMPLE_SUBMISSION.id,
      scores,
      totalScore: getTotalScore(),
    });
    alert("Scores submitted successfully!");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{SAMPLE_SUBMISSION.projectTitle}</CardTitle>
          <CardDescription>
            Team: {SAMPLE_SUBMISSION.teamName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {SAMPLE_SUBMISSION.description}
          </p>
          <a
            href={SAMPLE_SUBMISSION.submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View Submission
          </a>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Accordion
          type="single"
          collapsible
          value={expandedCriteria}
          onValueChange={setExpandedCriteria}
        >
          {SAMPLE_CRITERIA.map((criterion) => {
            const currentScore = scores.find(
              (s) => s.criterionId === criterion.id
            )?.score || 0;

            return (
              <AccordionItem key={criterion.id} value={criterion.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex justify-between w-full pr-4">
                    <span>{criterion.criterion}</span>
                    <span className="text-primary">
                      Score: {currentScore}/{criterion.maxScore}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-muted-foreground">
                      {criterion.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[currentScore]}
                          onValueChange={([value]) =>
                            handleScoreChange(criterion.id, value)
                          }
                          max={criterion.maxScore}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="w-12 text-right">
                          {currentScore}/{criterion.maxScore}
                        </span>
                      </div>
                      <Textarea
                        placeholder="Add feedback (optional)"
                        value={feedback[criterion.id] || ""}
                        onChange={(e) =>
                          handleFeedbackChange(criterion.id, e.target.value)
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <div className="text-lg font-semibold">
            Total Score: {getTotalScore()}/{SAMPLE_CRITERIA.reduce((sum, c) => sum + c.maxScore, 0)}
          </div>
          <Button onClick={handleSubmit} size="lg">
            Submit Evaluation
          </Button>
        </div>
      </div>
    </div>
  );
}