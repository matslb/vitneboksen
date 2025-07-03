export default interface Question {
  text: string;
  recordingDuration: number;
  activeFrom: string | null;
  activeTo: string | null;
  order: number;
}