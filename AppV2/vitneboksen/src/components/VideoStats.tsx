import SpinnerIcon from './SpinnerIcon';

interface VideoStatsProps {
    completed: number;
    inProgress: number;
    max: number;
    sessionStorageUsage: number;
    flexDirection: 'row' | 'col';
}

export default function VideoStats({ completed, inProgress, max, sessionStorageUsage, flexDirection }: VideoStatsProps) {
    const usagePercentage = Math.min((sessionStorageUsage / max) * 100, 100);
    const isFullOrOver = usagePercentage >= 98;
    
    return (
        <div className={`flex flex-${flexDirection} gap-2 justify-between`}>
            <div className="text-m ">
                <span className='bg-black/40 text-white text-center min-w-9 px-2 inline-block rounded'>{completed}</span> Vitnesbyrd
                {inProgress > 0 &&
                    <>
                        &nbsp;(&nbsp;<SpinnerIcon />{inProgress} på vei )
                    </>
                }
            </div>
            <div >
                <div className="text-sm text-right">
                <div className="inline-block">
                    {sessionStorageUsage.toFixed(0)} / {max} MB
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all ${
                                isFullOrOver ? 'bg-danger' : usagePercentage > 80 ? 'bg-orange-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${usagePercentage}%` }}
                            ></div>
                    </div>
                    {isFullOrOver && (
                        <div className="mt-1 text-xs font-semibold">
                            Vitneboken er full!
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
}
