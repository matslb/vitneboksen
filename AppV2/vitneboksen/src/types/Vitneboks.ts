import type Question from "./Question";

export const enum FinalVideoStatus  {
    notStarted = 0,
    started = 1,
    completed = 2
}

export interface Vitneboks {
  id: string;
  title: string;
  createdOn: string;
  videosToBeProcessed: number;
  completedVideos:number;
  finalVideoProcessingStatus: FinalVideoStatus;
  questions: Question[];
  isOpen: boolean;
}
