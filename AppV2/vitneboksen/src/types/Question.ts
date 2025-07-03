export default interface Question {
  text: string;
  recordingDuration: number;
  activeFrom: Date | null;
  activeTo: Date | null;
  order: number;
}