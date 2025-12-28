import { getDatabase, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { getPublicVitneboks, GetPublicVitneboksRef } from "../types/publicVitneboks";

interface RecIndicatorProps {
    vitneboksId: string;
}

export default function RecIndicator({ vitneboksId }: RecIndicatorProps) {

    const db = getDatabase();
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const publicVitneboksRef = GetPublicVitneboksRef(db, vitneboksId);
        onValue(publicVitneboksRef, async (snapshot) => {
            const vitneboks = await getPublicVitneboks(snapshot.val());
            setIsRecording(vitneboks?.isRecording ?? false);
        });
    }, [db, vitneboksId]);

    if (!isRecording) return null;

    return (
        <div className="bg-black/40 flex text-white px-2 py-1 rounded ">
            <div>REC</div>
            <div
                className="p-1 m-1 w-2 h-2"
                style={{
                    borderRadius: "50%",
                    backgroundColor: "red",
                    animation: "blinker 1s infinite",
                }}
            ></div>
        </div>);
}