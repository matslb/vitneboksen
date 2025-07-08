import { getDatabase, ref, remove, set, update } from "firebase/database";
import type Question from "../types/Question";
import { dateStringToLocal } from "../utils";
import ActiveFromToPicker from "./ActiveFromToDatePicker";
import QuestionDuration from "./QuestionDuration";

type QuestionBoxProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    question: Question,
    userId: string,
    vitneboksId: string
}

export default function QuestionBox({ vitneboksId, userId, question }: QuestionBoxProps) {
    const db = getDatabase();

    const handleDragStart = (e: React.DragEvent, id: string, order: number) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ id, order }));
    };

    const handleIsAllwaysActiveChange = (active: boolean) => {
        set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/allwaysActive`), active);
    };
    const handleDrop = (e: React.DragEvent, targetId: string, targetOrder: number) => {
        const { id: draggedId, order: draggedOrder } = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (!draggedId || draggedId === targetId) return;
        console.log(targetId, targetOrder);
        const updates: Record<string, number> = {};
        updates[`${draggedId}/order`] = targetOrder;
        updates[`${targetId}/order`] = draggedOrder;

        update(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions`), updates);
    };
    return (
        <div
            className="bg-white/10 py-6 px-4 rounded shadow-md relative"
            key={question.id}
            draggable
            onDragStart={(e) => handleDragStart(e, question.id, question.order)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, question.id, question.order)}
        >
            <span className="cursor-move text-xl absolute w-8 text-center  bg-black/50 rounded-br rounded-tl top-0 left-0" title="Dra for å endre rekkefølge">{question.order + 1}</span>
            <span className="absolute top-2 right-4 cursor-move text-2xl" title="Dra for å endre rekkefølge">≡</span>
            <div
                style={{
                    gridTemplateColumns: "4fr 2fr"
                }}
                className="grid  gap-4 justify-left mt-4">
                <div
                >
                    <label className="block mb-1">Spørsmålstekst</label>
                    <input
                        type="text"
                        maxLength={70}
                        value={question.text}
                        onChange={(e) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/text`), e.target.value)}
                        className="white w-full p-2 rounded text-black mb-1"
                    />
                </div>
                <div>
                    <label className="block mb-1">Opptakstid</label>
                    <QuestionDuration
                        recordingDuration={question.recordingDuration}
                        setRecordingDuration={(duration: number) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/recordingDuration`), duration)}
                    />
                </div>
            </div>
            <div className='mt-4'>
                <ActiveFromToPicker
                    setAllwaysActive={handleIsAllwaysActiveChange}
                    allwaysActive={question.allwaysActive}
                    activeFrom={dateStringToLocal(question.activeFrom!)}
                    activeTo={dateStringToLocal(question.activeTo!)}
                    onChangeTo={(to) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeTo`), new Date(to).toISOString())}
                    onChangeFrom={(from) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeFrom`), new Date(from).toISOString())}
                />
            </div>
            <div className="flex justify-end">
                <button
                    onClick={() => remove(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}`))}
                    className="bg-danger text-white px-4 py-2 rounded"
                >
                    Slett
                </button>
            </div>
        </div >
    );
}