import { useState } from 'react';
import { FinalVideoStatus, type Vitneboks } from '../types/Vitneboks';
import { downloadFinalVideo, downloadSessionFiles, startFinalVideoProcessing } from '../vitneboksService';
import SpinnerIcon from './SpinnerIcon';

type GenerateVideoButtonProps = {
    Vitneboks: Vitneboks,
    showZip: boolean,
};

export default function GenerateVideoButton({ Vitneboks, showZip = false }: GenerateVideoButtonProps) {

    const [isWaitingForDownload, setIsWaitingForDownload] = useState(false);

    const handleDownloadFinalVideo = () => {
        setIsWaitingForDownload(true);
        downloadFinalVideo(Vitneboks.id).finally(() => {
            setIsWaitingForDownload(false);
        });
    }
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
                                {!isWaitingForDownload && Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.completed &&
                                    <button
                                        onClick={handleDownloadFinalVideo}
                                        className={`bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg ${isWaitingForDownload ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        Last ned Vitneboksvideo
                                    </button>
                                }
                                {isWaitingForDownload &&
                                    <button
                                        className="flex bg-primary-button-disabled disabled text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                                        <SpinnerIcon />
                                        Forbereder nedlasting
                                    </button>
                                }
                                {Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.failed &&
                                    <div>
                                        <p className="text-red-500 mb-2">Noe gikk galt under sammensetting av videoen.</p>
                                        <button
                                            onClick={() => startFinalVideoProcessing(Vitneboks.id)}
                                            className="flex gap-2 bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg">
                                            Prøv igjen
                                        </button>
                                    </div>
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
