import { useEffect, useState } from "react";
import { type Vitneboks } from "../types/Vitneboks"
import { Link } from "react-router-dom";
import { getDatabase, onValue, ref } from "firebase/database";
import VideoStats from "./VideoStats";
import GenerateVideoButton from "./GenerateVideoButton";
import VitneboksLink from "./VitneboksLink";
import RecIndicator from "./RecIndicator";

interface VitneboxBoxProps {
    Vitneboks: Vitneboks
};

export default function VitneboksBox({ Vitneboks }: VitneboxBoxProps) {

    const [isRecording, setIsRecording] = useState<boolean>(false);
    const db = getDatabase();
    useEffect(() => {
        onValue(ref(db, `/activeSessions/${Vitneboks.id}`), (snapshot) => {
            const data: { isRecording?: boolean; activeQuestion?: number } | boolean | null = snapshot.val();
            if (typeof data === 'object' && data !== null) {
                setIsRecording(data.isRecording ?? false);
            } else {
                setIsRecording(false);
            }
        });
    }, [db]);
    return (
        <div className="relative p-6">
            <h2 className="text-xl font-semibold min-h-14 max-w-80 break-all">{Vitneboks.title}</h2>
            {!isRecording &&
                <div
                    className="bg-black/40 text-white p-2 rounded-bl rounded-tr absolute top-0 right-0"
                >{Vitneboks.isOpen ? "Åpen" : "Stengt"}
                </div>
            }
            <div className="absolute top-0 right-0">
                <RecIndicator vitneboksId={Vitneboks.id} />
            </div>
            <VitneboksLink vitneboksId={Vitneboks.id} />
            <div className='flex justify-between gap-2'>
                <p className="text-m mb-1"><span className='bg-black/40 text-center text-white min-w-9 inline-block rounded'>{Object.values(Vitneboks.questions)?.length}</span> Spørsmål</p>
                <VideoStats flexDirection="col" completed={Vitneboks.completedVideos} inProgress={Vitneboks.videosToBeProcessed} max={Vitneboks.maxStorage} sessionStorageUsage={Vitneboks.sessionStorageUsage} />
            </div>
            <div className="mt-4 text-right flex justify-between items-start gap-6">
                <GenerateVideoButton showZip={false} Vitneboks={Vitneboks} />
                <Link
                    to={`/admin/vitneboks/${Vitneboks.id}`}
                    className="bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
                >
                    Rediger
                </Link>
            </div>

        </div>
    );
}
