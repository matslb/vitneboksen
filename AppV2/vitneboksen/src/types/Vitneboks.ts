import type Question from "./Question";

export default interface Vitneboks {
  id: string;
  title: string;
  publicId: string; 
  createdOn: Date;
  uploadedVideos: number;
  questions: Question[];
}
