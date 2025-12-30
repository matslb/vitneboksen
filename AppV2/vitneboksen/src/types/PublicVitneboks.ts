import { Database, ref, update } from "firebase/database";
import type Question from "./Question";
import type { FinalVideoStatus } from "./Vitneboks";
import { getAuth, signInAnonymously } from "firebase/auth";

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
  videosToBeProcessed: number;
}

export async function getPublicVitneboks(
  data: PublicVitneboks
): Promise<PublicVitneboks | null> {
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
    videosToBeProcessed: data.videosToBeProcessed,
  };

  return publicVitneboks;
}

export const GetPublicVitneboksRef = (db: Database, id: string) => {
  return ref(db, `publicVitnebokser/${id}`);
};

export const SetPublicVitneboksIsRecording = async (
  db: Database,
  id: string,
  isRecording: boolean
) => {
  const vitneboksRef = GetPublicVitneboksRef(db, id);
  const auth = getAuth();

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      return; // Exit if we can't authenticate
    }
  }
  update(vitneboksRef, { isRecording });
};

export const SetPublicVitneboksActiveQuestionIndex = async (
  db: Database,
  id: string,
  activeQuestionIndex: number | undefined
) => {
  const auth = getAuth();

  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      return; // Exit if we can't authenticate
    }
  }

  const vitneboksRef = GetPublicVitneboksRef(db, id);
  return update(vitneboksRef, { activeQuestionIndex });
};
