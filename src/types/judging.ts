export interface JudgingCriterion {
  id: string;
  criterion: string;
  description: string;
  maxScore: number;
}

export interface Score {
  criterionId: string;
  score: number;
  feedback?: string;
}

export interface Submission {
  id: string;
  teamName: string;
  projectTitle: string;
  description: string;
  submissionUrl: string;
  scores?: Score[];
}