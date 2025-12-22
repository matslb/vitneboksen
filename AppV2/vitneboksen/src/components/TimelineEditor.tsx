import { useEffect, useState } from "react";
import type { Vitneboks } from "../types/Vitneboks";
import { deleteVideo, downloadSingleVideo, retryFailedVideo } from "../vitneboksService";
import GenerateVideoButton from "./GenerateVideoButton";
import VideoStats from "./VideoStats";
import SpinnerIcon from "./SpinnerIcon";
import ErrorIcon from "./ErrorIcon";

const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;

type TimelineEditorProps = {
    userToken: string;
    vitneboks: Vitneboks;
};

export default function TimelineEditor({
    vitneboks,
    userToken,
}: TimelineEditorProps) {
    const [gifSources, setGifSources] = useState<Record<string, string>>({});

    useEffect(() => {
        vitneboks.completedVideoIds.forEach((videoId) => {
            const gifUrl = `${API_URL}getgif/${videoId}?sessionKey=${vitneboks.id}&userToken=${userToken}`;
            setGifSources((prev) => ({ ...prev, [videoId]: gifUrl }));
        });
    }, [vitneboks.completedVideoIds, vitneboks.id, userToken]);

    const handleDelete = (videoId: string) => {
        if (!confirm("Slett dette vitnesbyrdet?")) return;
        deleteVideo(vitneboks.id, videoId, userToken);
    };

    const handleRetry = async (videoId: string) => {
        await retryFailedVideo(vitneboks.id, videoId, userToken);
    };

    // Merge completed and failed videos chronologically
    const allVideoIds = [...vitneboks.completedVideoIds, ...vitneboks.failedVideoIds]
        .sort((a, b) => Number(a) - Number(b));
    const failedVideoSet = new Set(vitneboks.failedVideoIds);

    return (
        <>
            <h3 className="text-xl font-bold">Vitnesbyrd</h3>
            <div className="bg-white/10 rounded p-4 my-4 overflow-x-auto">
                <VideoStats completed={vitneboks.completedVideos} inProgress={vitneboks.videosToBeProcessed} />
                {allVideoIds.length > 0 &&
                    <div className="flex gap-2 my-4 overflow-x-scroll pb-1">
                        {allVideoIds.map((videoId) => {
                            const date = new Date(Number(videoId));
                            const isFailed = failedVideoSet.has(videoId);
                            const src = gifSources[videoId] ?? "";

                            return (
                                <div
                                    key={videoId}
                                    className="relative bg-black/50 rounded shadow-md p-1 rounded shrink-0"
                                >
                                    <div className="absolute top-1 left-1 bg-black/60 py-1 rounded-br rounded-tl px-2 text-sm text-white">
                                        kl {date.getHours().toString().padStart(2, "0")}:{date.getMinutes().toString().padStart(2, "0")}
                                    </div>
                                    {isFailed ? (
                                        <div className="rounded min-h-[135px] w-60 flex flex-col justify-center items-center gap-2 p-4">
                                            <ErrorIcon />
                                            <p className="text-white text-sm text-center">Denne videoen feilet</p>
                                        </div>
                                    ) : (
                                        src == "" ?
                                            <div className="rounded min-h-[135px] w-60 flex justify-center items-center">
                                                <SpinnerIcon />
                                            </div>
                                            :
                                            <img
                                                src={src}
                                                alt="Ingen gif. Noe har gått galt. Slett denne dersom Vitneboksvideoen ikke blir som forventet"
                                                className="rounded min-h-[135px] w-60"
                                            />
                                    )}
                                    <div className="flex justify-between items-center m-2">
                                        {isFailed ? (
                                            <button
                                                onClick={() => handleRetry(videoId)}
                                                className="px-3 py-1 text-sm rounded bg-primary-button text-black hover:bg-secondary-bg hover:text-white"
                                            >
                                                Prøv igjen
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => downloadSingleVideo(vitneboks.id, videoId, userToken)}
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
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }
                <GenerateVideoButton Vitneboks={vitneboks} showZip={true} />
            </div>
        </>
    );
}
