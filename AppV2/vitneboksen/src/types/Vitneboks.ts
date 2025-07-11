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
  deletionFromDate?: string;
  videosToBeProcessed: number;
  completedVideos:number;
  completedVideoIds: string[];
  finalVideoProcessingStatus: FinalVideoStatus;
  questions: Question[];
  isOpen: boolean;
  uid: string;
}
