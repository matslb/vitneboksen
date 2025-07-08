import type Question from "./Question";
import type { FinalVideoStatus } from "./Vitneboks";

export default interface PublicVitneboks {
    id: string;
    uid: string;
    title: string;
    questions: Question[];
    finalVideoProcessingStatus: FinalVideoStatus;
    isOpen: boolean;
}
