import type { Vitneboks } from "../types/Vitneboks";
import { deleteVideo } from "../vitneboksService";
import GenerateVideoButton from "./GenerateVideoButton";
import VideoStats from "./VideoStats";

const API_URL = import.meta.env.VITE_VIDEO_PROCESSOR_URL;

type TimelineEditorProps = {
    userToken: string;
    vitneboks: Vitneboks;
};

export default function TimelineEditor({
    vitneboks,
    userToken,
}: TimelineEditorProps) {

    const handleDelete = (videoId: string) => {

        if (!confirm("Slett dette vitnesbyrdet?")) return;
        deleteVideo(vitneboks.id, videoId, userToken)
    }
    return (
        <>
            <h3 className="text-xl font-bold">Vitnesbyrd</h3>
            <div className="bg-white/10 rounded p-4 my-4 overflow-x-auto">
                <VideoStats completed={vitneboks.completedVideos} inProgress={vitneboks.videosToBeProcessed} />
                <div className="flex gap-2 my-4 overflow-x-scroll pb-1">
                    {vitneboks.completedVideoIds.map((videoId) => {
                        const date = new Date(Number(videoId));
                        return (
                            <div
                                key={videoId}
                                className="bg-black/50 rounded shadow-md p-1 rounded shrink-0"
                            >
                                <img
                                    src={`${API_URL}getgif/${videoId}?sessionKey=${vitneboks.id}&userToken=${userToken}`}
                                    alt="Ingen gif. Noe har gått feil. Slett denne dersom Vitneboksvideoen ikke blir som forventet"
                                    className="rounded min-h-[135px] w-60"
                                />
                                <div className="flex justify-between items-center m-2">
                                    <div className="text-sm text-white ">{date.toLocaleDateString()} - kl {date.getHours()}:{date.getMinutes()}</div>
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
                <GenerateVideoButton Vitneboks={vitneboks} showZip={true} />
            </div>
        </>
    );
}
