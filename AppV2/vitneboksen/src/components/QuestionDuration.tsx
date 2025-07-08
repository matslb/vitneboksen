
type QuestionDurationProps = {
    recordingDuration: number,
    setRecordingDuration: (duration: number) => void,
}

export default function QuestionDuration({ recordingDuration, setRecordingDuration }: QuestionDurationProps) {
    return (
        <select
            value={recordingDuration}
            onChange={(e) => setRecordingDuration(parseInt(e.target.value))}
            className="white w-full max-w-35 p-2 rounded text-black mb-4"
        >
            <option value={10}>10 sekunder</option>
            <option value={15}>15 sekunder</option>
            <option value={20}>20 sekunder</option>
            <option value={25}>25 sekunder</option>
            <option value={30}>30 sekunder</option>
        </select>

    );
}
