import { getDatabase, ref, remove, set, update, onValue } from "firebase/database";
import type Question from "../types/Question";
import { dateStringToLocal } from "../utils";
import ActiveFromToPicker from "./ActiveFromToDatePicker";
import QuestionDuration from "./QuestionDuration";
import { useEffect, useState } from "react";
import RecIndicator from "./RecIndicator";
import { getPublicVitneboks, GetPublicVitneboksRef } from "../types/publicVitneboks";

type QuestionBoxProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    question: Question,
    allQuestions: Question[],
    userId: string,
    vitneboksId: string
}

export default function QuestionBox({ vitneboksId, userId, question, allQuestions }: QuestionBoxProps) {
    const db = getDatabase();
    const [activeQuestion, setActiveQuestion] = useState<number | undefined>(undefined);

    useEffect(() => {
        const publicVitneboksRef = GetPublicVitneboksRef(db, vitneboksId);
        onValue(publicVitneboksRef, async (snapshot) => {
            const vitneboks = await getPublicVitneboks(snapshot.val());
            setActiveQuestion(vitneboks?.activeQuestionIndex);
        });
    }, [db, vitneboksId]);

    const isActiveQuestion = activeQuestion !== undefined && activeQuestion === question.order;

    const handleDelete = () => {
        // Remove the question
        remove(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}`));

        // Get remaining questions sorted by order
        const remainingQuestions = allQuestions
            .filter(q => q.id !== question.id)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Update order values to be sequential starting from 0
        const updates: Record<string, number> = {};
        remainingQuestions.forEach((q, index) => {
            updates[`${q.id}/order`] = index;
        });

        // Apply updates if there are any remaining questions
        if (remainingQuestions.length > 0) {
            update(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions`), updates);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string, order: number) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ id, order }));
    };

    const handleIsAllwaysActiveChange = (active: boolean) => {
        set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/allwaysActive`), active);
        if (!active) {
            set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeTo`), null);
            set(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions/${question.id}/activeFrom`), null);
        }
    };
    const handleDrop = (e: React.DragEvent, targetId: string, targetOrder: number) => {
        const { id: draggedId, order: draggedOrder } = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (!draggedId || draggedId === targetId) return;
        const updates: Record<string, number> = {};
        updates[`${draggedId}/order`] = targetOrder;
        updates[`${targetId}/order`] = draggedOrder;

        update(ref(db, `${userId}/vitnebokser/${vitneboksId}/questions`), updates);
    };
    return (
        <div
            className={`bg-white/10 py-6 px-4 rounded shadow-md max-w-5xl relative ${isActiveQuestion ? 'border-4 border-yellow-400' : ''}`}
            key={question.id}
            draggable
            onDragStart={(e) => handleDragStart(e, question.id, question.order)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, question.id, question.order)}
        >
            <div className="w-100 flex flex-row gap-1 absolute top-0 left-0">
                <span className="cursor-move py-1 px-3 text-center block bg-black/40 rounded-br rounded-tl" title="Dra for å endre rekkefølge">
                    {question.order + 1}
                </span>
                {isActiveQuestion &&
                    <RecIndicator vitneboksId={vitneboksId} />
                }
            </div>
            <span className="absolute top-2 right-4 cursor-move text-2xl" title="Dra for å endre rekkefølge">≡</span>
            <div
                style={{
                    gridTemplateColumns: "4fr 2fr"
                }}
                className="grid gap-4 align-between mt-4">
                <div
                    className="w-full"
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
                <div
                    className="w-full"
                >
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
                    onClick={handleDelete}
                    className="bg-danger text-white px-4 py-2 rounded"
                >
                    Slett
                </button>
            </div>
        </div >
    );
}