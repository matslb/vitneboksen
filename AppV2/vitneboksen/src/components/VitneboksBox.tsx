import { useState } from "react";
import { FinalVideoStatus, type Vitneboks } from "../types/Vitneboks"
import SpinnerIcon from "./SpinnerIcon"
import { Link } from "react-router-dom";
import { downloadFinalVideo, startFinalVideoProcessing } from "../videoProcessorService";

interface VitneboxBoxProps  {
    Vitneboks:  Vitneboks
};


export default function VitneboksBox({Vitneboks}: VitneboxBoxProps) {

    const [copied, setCopied] = useState<string | null>(null);
  
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(console.error);
  };
  
    return (
     <div>
            <h2 className="text-xl font-semibold mb-2">{Vitneboks.title}</h2>
            <div className='flex flex-col gap-2'>

            <p className="text-m text-muted mb-1"><span className='bg-white text-center text-black min-w-9 inline-block pl-2 pr-2 pt-1 pb-1 rounded'>{Object.keys(Vitneboks.questions).length}</span> spørsmål</p>

            <p className="text-m text-muted"><span className='bg-white text-black text-center min-w-9 inline-block pl-2 pr-2 pt-1 pb-1 rounded'>{Vitneboks.completedVideos}</span> vitnesbyrd
            { Vitneboks.videosToBeProcessed > 0 &&
                <>
                    &nbsp;(&nbsp;<SpinnerIcon />{Vitneboks.videosToBeProcessed} til på vei)
                </>
            }
            </p>
        </div>
        {Object.values(Vitneboks.questions).length > 0 ?
            <div>
            <label className="text-sm">Vitnebokslink</label>
            <input
                readOnly
                value={`${window.location.origin}/vitne/${Vitneboks.id}`}
                onClick={() => handleCopy(`${window.location.origin}/vitne/${Vitneboks.id}`, 'Vitnebokslink kopiert!')}
                className="w-full p-2 rounded bg-white text-black mb-2 cursor-pointer"
                />
                { /*
            <label className="text-sm">Delelink</label>
            <input
                readOnly
                value={`${window.location.origin}/bidra/${vb.id}`}
                onClick={() => handleCopy(`${window.location.origin}/bidra/${vb.id}`, 'Delelink kopiert!')}
                className="w-full p-2 rounded bg-white text-black cursor-pointer"
                /> */}
            {copied && <p className="text-green-500 text-sm mt-1">{copied}</p>}
            </div>
            : 
            <div>
                <p>Legg til spørsmål for å komme i gang.</p>
            </div>
            }
            
            <div className="mt-4 text-right flex flex-row-reverse justify-between gap-6">
                <Link
                to={`/admin/vitneboks/${Vitneboks.id}`}
                className="bg-primary-button text-black px-4 py-2 rounded"
                >
                Rediger
            </Link>

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
            { Vitneboks.completedVideos > 0 && Vitneboks.finalVideoProcessingStatus == FinalVideoStatus.completed && 
            <button 
            onClick={() => downloadFinalVideo(Vitneboks.id)}
            className="bg-primary-button text-black px-4 py-2 rounded">
                Last ned Vitneboksvideo
            </button>
            }
            
        </div>
    </div>
  );
}
