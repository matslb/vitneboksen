import type Question from "./Question";

export default interface PublicVitneboks {
    id: string;
    title: string;
    questions: Question[];
}
