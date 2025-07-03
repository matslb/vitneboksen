import type Question from "./Question";

export default interface Vitneboks {
  id: string;
  title: string;
  createdOn: string;
  uploadedVideos: number;
  questions: Question[];
}
