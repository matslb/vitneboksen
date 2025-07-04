import type Question from "./Question";

export default interface PublicVitneboks {
    id: string;
    uid: string;
    title: string;
    questions: Question[];
}
