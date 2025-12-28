export default interface Question {
  id: string;
  text: string;
  recordingDuration: number;
  allwaysActive: boolean;
  activeFrom: string | null;
  activeTo: string | null;
  order: number;
  maxSubmissions?: number;
}