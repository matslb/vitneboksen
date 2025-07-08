import { useEffect, useState } from "react";
import { FinalVideoStatus, type Vitneboks } from "../types/Vitneboks"
import SpinnerIcon from "./SpinnerIcon"
import { Link } from "react-router-dom";
import { downloadFinalVideo, startFinalVideoProcessing } from "../videoProcessorService";
import { getDatabase, onValue, ref } from "firebase/database";

interface VitneboxBoxProps {
    Vitneboks: Vitneboks
};


export default function VitneboksBox({ Vitneboks }: VitneboxBoxProps) {

    const [copied, setCopied] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        }).catch(console.error);
    };
    const db = getDatabase();
    useEffect(() => {
        onValue(ref(db, `/activeSessions/${Vitneboks.id}`), (snapshot) => {
            const data: boolean = snapshot.val();
            setIsRecording(data);
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
            {isRecording &&
                <div
                    className="bg-black/40 flex text-white p-2 rounded-bl rounded-tr-[7px] absolute top-0 right-0"
                >
                    <div>REC</div>
                    <div className='p-1 m-1 w-2 h-2'
                        style={{
                            borderRadius: "50%",
                            backgroundColor: "red",
                            animation: "blinker 1s infinite",
                        }}
                    >
                    </div>
                </div>
            }
            <div className="py-4">
                <label className="text-sm">Vitnebokslink</label>
                <input
                    readOnly
                    value={`${window.location.origin}/vitne/${Vitneboks.id}`}
                    onClick={() => handleCopy(`${window.location.origin}/vitne/${Vitneboks.id}`, 'Vitnebokslink kopiert!')}
                    className="w-full p-2 rounded bg-white text-black mb-2 cursor-pointer"
                />
                {copied && <p className="text-green-500 text-sm mt-1">{copied}</p>}
            </div>
            <div className='flex justify-between gap-2'>
                <p className="text-m "><span className='bg-black/40 text-white text-center min-w-9 inline-block rounded'>{Vitneboks.completedVideos}</span> Vitnesbyrd
                    {Vitneboks.videosToBeProcessed > 0 &&
                        <>
                            &nbsp;(&nbsp;<SpinnerIcon />{Vitneboks.videosToBeProcessed} til på vei)
                        </>
                    }
                </p>
                <p className="text-m mb-1"><span className='bg-black/40 text-center text-white min-w-9 inline-block rounded'>{Object.values(Vitneboks.questions)?.length}</span> Spørsmål</p>

            </div>
            <div className="mt-4 text-right flex flex-row-reverse justify-between gap-6">
                <Link
                    to={`/admin/vitneboks/${Vitneboks.id}`}
                    className="bg-primary-button text-black px-4 py-2 rounded"
                >
                    Rediger
                </Link>
                {Vitneboks.videosToBeProcessed == 0 &&
                    <>
                        {Vitneboks.completedVideos > 1 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.notStarted &&
                            <button
                                onClick={() => startFinalVideoProcessing(Vitneboks.id)}
                                className=" flex gap-2 bg-primary-button  text-black px-4 py-2 rounded ">
                                Generer Vitneboksvideo
                            </button>
                        }
                        {Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.started &&
                            <button
                                className="flex bg-primary-button-disabled disabled text-black px-4 py-2 rounded ">
                                <SpinnerIcon />
                                Vitneboksvideo mekkes nå
                            </button>
                        }
                        {Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.completed &&
                            <button
                                onClick={() => downloadFinalVideo(Vitneboks.id)}
                                className="bg-primary-button text-black px-4 py-2 rounded">
                                Last ned Vitneboksvideo
                            </button>
                        }
                    </>
                }
            </div>

        </div>
    );
}
