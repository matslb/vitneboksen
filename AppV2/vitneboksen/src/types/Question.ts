export default interface Question {
  id: string;
  text: string;
  recordingDuration: number;
  activeFrom: string | null;
  activeTo: string | null;
  order: number;
}