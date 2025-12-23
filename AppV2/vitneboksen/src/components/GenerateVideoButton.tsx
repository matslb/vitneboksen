import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import { downloadFinalVideo, downloadSessionFiles, startFinalVideoProcessing } from '../vitneboksService';
import SpinnerIcon from './SpinnerIcon';

type GenerateVideoButtonProps = {
    Vitneboks: Vitneboks,
    showZip: boolean,
};

export default function GenerateVideoButton({ Vitneboks, showZip = false }: GenerateVideoButtonProps) {
    return (
        <div>
            {Vitneboks.completedVideos > 0 &&
                <div>
                    {Vitneboks.videosToBeProcessed === 0 &&
                        <div >
                            <>
                                {
                                    Vitneboks.completedVideos > 1 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.notStarted &&
                                    <button
                                        onClick={() => startFinalVideoProcessing(Vitneboks.id)}
                                        className=" flex gap-2 bg-primary-button  text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                                        Sett sammen Vitneboksvideo
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
                        </div >
                    }
                    {(showZip && Vitneboks.completedVideos > 0) &&
                        <button className='mt-2 hover:underline' onClick={() => downloadSessionFiles(Vitneboks.id)}>Last ned alle vitnesbyrd (.zip)</button>
                    }
                </div >
            }
        </div>
    );
}
