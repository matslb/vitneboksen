import type { Vitneboks } from "../types/Vitneboks";
import { deleteVideo, downloadSingleVideo, retryFailedVideo } from "../vitneboksService";
import GenerateVideoButton from "./GenerateVideoButton";
import VideoStats from "./VideoStats";
import ErrorIcon from "./ErrorIcon";

const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;

type TimelineEditorProps = {
    vitneboks: Vitneboks;
};

export default function TimelineEditor({
    vitneboks,
}: TimelineEditorProps) {

    const handleDelete = (videoId: string) => {
        if (!confirm("Slett dette vitnesbyrdet?")) return;
        deleteVideo(vitneboks.id, videoId);
    };

    const handleRetry = async (videoId: string) => {
        await retryFailedVideo(vitneboks.id, videoId);
    };

    return (
        <>
            <h3 className="text-xl font-bold">Vitnesbyrd</h3>

            <div className="bg-white/10 rounded p-4 my-4 overflow-x-auto">
                <VideoStats flexDirection="row" completed={vitneboks.completedVideos} inProgress={vitneboks.videosToBeProcessed} max={vitneboks.maxStorage} sessionStorageUsage={vitneboks.sessionStorageUsage} />
                {vitneboks.completedVideoIds.length > 0 &&
                    <div className="flex gap-2 my-4 overflow-x-scroll pb-1">
                        {vitneboks.completedVideoIds.map((videoId) => {
                            const date = new Date(Number(videoId));
                            return (
                                <div
                                    key={videoId}
                                    className="relative bg-black/50 rounded shadow-md p-1 rounded shrink-0"
                                >
                                    <div className="absolute top-1 left-1 bg-black/60 py-1 rounded-br rounded-tl px-2 text-sm text-white">
                                        kl {date.getHours().toString().padStart(2, "0")}:{date.getMinutes().toString().padStart(2, "0")}
                                    </div>
                                    <img
                                        src={`${API_URL}getgif/${videoId}?sessionKey=${vitneboks.id}`}
                                        alt="Ingen gif. Noe har gått galt. Slett denne dersom Vitneboksvideoen ikke blir som forventet"
                                        className="rounded min-h-[135px] w-60"
                                    />
                                    <div className="flex justify-between items-center m-2">
                                        <button
                                            onClick={() => downloadSingleVideo(vitneboks.id, videoId)}
                                            className="px-3 py-1 text-sm rounded bg-primary-button text-black hover:bg-secondary-bg hover:text-white"
                                        >
                                            Last ned
                                        </button>
                                        <button
                                            onClick={() => handleDelete(videoId)}
                                            className="px-3 py-1 text-sm rounded bg-danger text-white hover:bg-red-700"
                                        >
                                            Slett
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }
                {vitneboks.failedVideoIds.length > 0 &&
                    <div className="pt-4">
                        <h4 className="text-xl font-bold">Feil</h4>
                        Disse fikk vi ikke til å kna. Du kan prøve igjen om du vil, men ingen garanti.
                        <div className="flex gap-2 my-4 overflow-x-scroll pb-1">
                            {vitneboks.failedVideoIds.map((videoId) => {
                                const date = new Date(Number(videoId));

                                return (
                                    <div
                                        key={videoId}
                                        className="relative bg-black/50 rounded shadow-md p-1 rounded shrink-0"
                                    >
                                        <div className="absolute top-1 left-1 bg-black/60 py-1 rounded-br rounded-tl px-2 text-sm text-white">
                                            kl {date.getHours().toString().padStart(2, "0")}:{date.getMinutes().toString().padStart(2, "0")}
                                        </div>
                                        <div className="rounded min-h-[10px] w-40 flex flex-col justify-center items-center gap-2 p-2">
                                            <ErrorIcon />
                                        </div>
                                        <div className="flex justify-between items-center m-2">
                                            <button
                                                onClick={() => handleRetry(videoId)}
                                                className="px-3 py-1 text-sm rounded bg-primary-button text-black hover:bg-secondary-bg hover:text-white"
                                            >
                                                Prøv igjen
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                }
                <GenerateVideoButton Vitneboks={vitneboks} showZip={true} />
            </div>
        </>
    );
}
