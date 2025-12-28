import { Database, ref, update } from "firebase/database";
import type Question from "./Question";
import type { FinalVideoStatus } from "./Vitneboks";

export interface PublicVitneboks {
  id: string;
  title: string;
  maxStorage: number;
  finalVideoProcessingStatus: FinalVideoStatus;
  questions: Question[];
  activeQuestionIndex: number;
  isOpen: boolean;
  isRecording?: boolean | undefined;
  sessionStorageUsage?: number | undefined;
}

export async function getPublicVitneboks(data: PublicVitneboks): Promise<PublicVitneboks | null> {
  const publicVitneboks: PublicVitneboks = {
    id: data.id,
    title: data.title,
    maxStorage: data.maxStorage,
    finalVideoProcessingStatus: data.finalVideoProcessingStatus,
    questions: data.questions ?? [],
    isOpen: data.isOpen,
    isRecording: data.isRecording,
    sessionStorageUsage: data.sessionStorageUsage,
    activeQuestionIndex: data.activeQuestionIndex,
  };

  return publicVitneboks;
}

export const GetPublicVitneboksRef = (db: Database, id: string) => {
  return ref(db, `publicVitnebokser/${id}`);
}

export const SetPublicVitneboksIsRecording = (db: Database, id: string, isRecording: boolean) => {
  const vitneboksRef = GetPublicVitneboksRef(db, id);
  update(vitneboksRef, { isRecording });
};

export const SetPublicVitneboksActiveQuestionIndex = (db: Database, id: string, activeQuestionIndex: number| undefined) => {
  const vitneboksRef = GetPublicVitneboksRef(db, id);
  update(vitneboksRef, { activeQuestionIndex });
};
