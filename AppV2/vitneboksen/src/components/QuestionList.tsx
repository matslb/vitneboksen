import { useState } from "react";
import type Question from "../types/Question";
import QuestionBox from "./QuestionBox";
import { getDatabase, push, ref } from "firebase/database";
import { dateStringToLocal } from "../utils";
import ActiveFromToPicker from "./ActiveFromToDatePicker";
import QuestionDuration from "./QuestionDuration";

type QuestionListProps = {
  questions: Question[]
  userId: string,
  vitneBoksId: string
}

export default function QuestionList({ vitneBoksId, userId, questions }: QuestionListProps) {

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newRecordingDuration, setNewRecordingDuration] = useState(10);
  const [alwaysActive, setAlwaysActive] = useState(true);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const db = getDatabase();

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;

    const questionsRef = ref(db, `${userId}/vitnebokser/${vitneBoksId}/questions`);
    const newQuestion = {
      text: newQuestionText,
      recordingDuration: newRecordingDuration,
      activeFrom: alwaysActive || !activeFrom ? null : dateStringToLocal(activeFrom),
      activeTo: alwaysActive || !activeTo ? null : dateStringToLocal(activeTo),
      order: Object.keys(questions).length
    };
    push(questionsRef, newQuestion);

    setNewQuestionText('');
  };

  return (
    <>
      <div className="w-full max-w-3xl space-y-4 mb-8">
        {questions.map((q) => (
          <QuestionBox
            key={q.id}
            userId={userId}
            vitneboksId={vitneBoksId}
            question={q}
          />
        ))}
      </div>
      <div className="w-full max-w-md bg-secondary-bg rounded-lg shadow-lg p-6 border border-muted mb-8">
        <h2 className="text-xl font-semibold mb-4">Legg til nytt spørsmål</h2>
        <label className="block mb-1">Spørsmålstekst</label>
        <input
          type="text"
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          placeholder="Spørsmålstekst"
          className="white w-full p-2 rounded text-black mb-4"
        />
        <label className="block mb-1">Opptakstid</label>
        <QuestionDuration recordingDuration={newRecordingDuration} setRecordingDuration={setNewRecordingDuration} />
        <ActiveFromToPicker alwaysActive={alwaysActive} setAlwaysActive={setAlwaysActive} activeFrom={activeFrom} activeTo={activeTo} onChangeFrom={setActiveFrom} onChangeTo={setActiveTo} />
        <button
          onClick={handleAddQuestion}
          className="bg-primary-button text-black px-4 py-2 rounded hover:bg-secondary w-full"
        >
          Legg til spørsmål
        </button>
      </div>
    </>
  );
}