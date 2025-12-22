import SpinnerIcon from './SpinnerIcon';

interface VideoStatsProps {
    completed: number;
    inProgress: number;
    max: number;
}

export default function VideoStats({ completed, inProgress, max }: VideoStatsProps) {
    return (
        <div className="text-m "><span className='bg-black/40 text-white text-center min-w-9 px-2 inline-block rounded'>{completed} / {max}</span> Vitnesbyrd
            {inProgress > 0 &&
                <>
                    &nbsp;(&nbsp;<SpinnerIcon />{inProgress} på vei )
                </>
            }
        </div>
    );
}
