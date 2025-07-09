import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import { downloadFinalVideo, startFinalVideoProcessing } from '../videoProcessorService';
import SpinnerIcon from './SpinnerIcon';

type GenerateVideoButtonProps = {
    Vitneboks: Vitneboks
};

export default function GenerateVideoButton({ Vitneboks }: GenerateVideoButtonProps) {
    return (
        <>
            {Vitneboks.videosToBeProcessed == 0 &&
                <>
                    {
                        Vitneboks.completedVideos > 1 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.notStarted &&
                        <button
                            onClick={() => startFinalVideoProcessing(Vitneboks.id)}
                            className=" flex gap-2 bg-primary-button  text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                            Generer Vitneboksvideo
                        </button>
                    }
                    {Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started &&
                        <button
                            className="flex bg-primary-button-disabled disabled text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                            <SpinnerIcon />
                            Vitneboksvideo mekkes nå
                        </button>
                    }
                    {Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.completed &&
                        <button
                            onClick={() => downloadFinalVideo(Vitneboks.id)}
                            className="bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                            Last ned Vitneboksvideo
                        </button>
                    }
                </>
            }
        </>);
}
