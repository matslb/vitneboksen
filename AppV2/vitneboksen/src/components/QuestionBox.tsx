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
            className="bg-secondary-bg p-4 rounded border border-muted relative"
            key={question.id}
            draggable
            onDragStart={(e) => handleDragStart(e, question.id, question.order)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, question.id, question.order)}
        >
            <span className="cursor-move text-xl" title="Dra for å endre rekkefølge">Spørsmål {question.order + 1}</span>
            <span className="absolute top-2 right-4 cursor-move text-2xl" title="Dra for å endre rekkefølge">≡</span>
            <div className="flex w-full gap-2 justify-left mt-4">
                <div
                    className="w-[80%]"
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
                <div className="w-[20%]">
                    <label className="block mb-1">Opptakstid</label>
                    <QuestionDuration
                        recordingDuration={question.recordingDuration}
                        setRecordingDuration={(duration: number) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/recordingDuration`), duration)}
                    />
                </div>
            </div>
            <div className='mt-4'>
                <ActiveFromToPicker
                    setAlwaysActive={handleIsAllwaysActiveChange}
                    alwaysActive={question.allwaysActive}
                    activeFrom={dateStringToLocal(question.activeFrom!)}
                    activeTo={dateStringToLocal(question.activeTo!)}
                    onChangeTo={(to) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeTo`), new Date(to).toISOString())}
                    onChangeFrom={(from) => set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeFrom`), new Date(from).toISOString())}
                />
            </div>
            <button
                onClick={() => remove(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}`))}
                className="bg-danger text-white px-4 py-2  rounded"
            >
                Slett
            </button>
        </div >
    );
}