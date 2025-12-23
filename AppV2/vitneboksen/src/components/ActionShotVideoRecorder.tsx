import VideoRecorder from './VideoRecorder';
import type Question from '../types/Question';

interface ActionShotVideoRecorderProps {
  userName: string;
  vitneboksId: string;
  onFinish: () => void;
}

export default function ActionShotVideoRecorder({ userName, vitneboksId, onFinish }: ActionShotVideoRecorderProps) {
  // Create a Question object with hardcoded 10-second duration and custom subtitle
  const question: Question = {
    id: 'actionshot',
    text: `Sendt inn av ${userName}`,
    recordingDuration: 10,
    allwaysActive: true,
    activeFrom: null,
    activeTo: null,
    order: 0,
  };

  return (
    <VideoRecorder
      question={question}
      vitneboksId={vitneboksId}
      onFinish={onFinish}
      hideQuestionText={true}
    />
  );
}

