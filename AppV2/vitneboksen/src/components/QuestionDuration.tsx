
type QuestionDurationProps = {
    recordingDuration: number,
    setRecordingDuration: (duration: number) => void,
}

export default function QuestionDuration({ recordingDuration, setRecordingDuration }: QuestionDurationProps) {
    return (
        <select
            value={recordingDuration}
            onChange={(e) => setRecordingDuration(parseInt(e.target.value))}
            className="white w-full p-2 rounded text-black"
        >
            <option value={10}>10 sek</option>
            <option value={15}>15 sek</option>
            <option value={20}>20 sek</option>
            <option value={25}>25 sek</option>
        </select>

    );
}
