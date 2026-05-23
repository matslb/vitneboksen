import { useState } from "react";
import type Question from "../types/Question";
import QuestionBox from "./QuestionBox";
import {getDatabase, push, ref, set} from "firebase/database";
import { dateStringToLocal } from "../utils";
import ActiveFromToPicker from "./ActiveFromToDatePicker";
import QuestionDuration from "./QuestionDuration";
import ToggleSwitch from "./ToggleSwitch.tsx";

type DesktopSettingsProps = {
  questions: Question[]
  userId: string,
  vitneboksIsOpen: boolean,
  vitneBoksId: string,
  actionShotDuration: number,
}

export default function DesktopSettings({ vitneBoksId,actionShotDuration, vitneboksIsOpen, userId, questions }: DesktopSettingsProps) {

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newRecordingDuration, setNewRecordingDuration] = useState(10);
  const [allwaysActive, setAllwaysActive] = useState(true);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const db = getDatabase();

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;

    const questionsRef = ref(db, `${userId}/vitnebokser/${vitneBoksId}/questions`);
    const newQuestion = {
      text: newQuestionText,
      recordingDuration: newRecordingDuration,
      activeFrom: activeFrom != "" ? dateStringToLocal(activeFrom) : "",
      activeTo: activeTo != "" ? dateStringToLocal(activeTo) : "",
      allwaysActive: allwaysActive,
      order: Object.keys(questions).length
    };
    push(questionsRef, newQuestion);

    setNewQuestionText('');
  };
  return (
    <>
      <div className="w-full flex flex-col gap-4 bg-white/10 rounded shadow-md p-4 mb-4">
        <h2 className="text-xl font-semibold ">Innstillinger for PC</h2>
        <p>Åpne vitnebokslinken på datamaskinen du skal bruke på festen din. Send inn gjestene dine og la dem svare på spørsmålene du har lagt inn her.
          Bruk et eksternt webkamera og mikrofon for best mulig kvalitet.
        </p>
        <div className="p-4 w-full bg-white/5 flex justify-between items-center">
          <ToggleSwitch
              label={"Ta imot videoer på PC"}
              checked={vitneboksIsOpen}
              onChange={(checked) =>
                  set(ref(db, `${userId}/vitnebokser/${vitneBoksId}/isOpen`), checked)
              }
          />
          <div className="flex items-center gap-10  w-1/2">
            <span>Opptakstid uten spørsmål</span>
            <select
                value={actionShotDuration ?? 10}
                onChange={(e) =>
                    set(
                        ref(db, `${userId}/vitnebokser/${vitneBoksId}/actionShotDuration`),
                        parseInt(e.target.value)
                    )
                }
                className="bg-primary-bg text-primary-text p-2 rounded border border-white/20"
            >
              <option value={10}>10 sekunder</option>
              <option value={15}>15 sekunder</option>
              <option value={20}>20 sekunder</option>
            </select>
          </div>
        </div>
        <div>
        </div>
        {questions.length > 0 &&
        <ul className=" flex flex-col gap-4">
          {questions.map((q) => (
            <li key={q.id}>
              <QuestionBox
                userId={userId}
                vitneboksId={vitneBoksId}
                question={q}
                allQuestions={questions}
                isOpen={vitneboksIsOpen}
              />
            </li>
          ))}
        </ul>
        }
      <div className="w-full bg-white/5 rounded shadow-md p-4">
      <h3 className="text-lg font-semibold ">Legg til spørsmål</h3>
        <div
          style={{
            gridTemplateColumns: "4fr 2fr"
          }}
          className="grid gap-4 justify-left">
          <div>
            <label className="block mb-1">Spørsmålstekst</label>
            <input
              type="text"
              maxLength={70}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Spørsmålstekst"
              className="white w-full p-2 rounded text-black mb-4"
            />
          </div>
          <div>
            <label className="block mb-1">Opptakstid</label>
            <QuestionDuration recordingDuration={newRecordingDuration} setRecordingDuration={setNewRecordingDuration} />
          </div>
        </div>
        <ActiveFromToPicker allwaysActive={allwaysActive} setAllwaysActive={setAllwaysActive} activeFrom={activeFrom} activeTo={activeTo} onChangeFrom={setActiveFrom} onChangeTo={setActiveTo} />
        <div className="flex justify-end">
          <button
            onClick={handleAddQuestion}
            className="bg-primary-button text-black px-4 py-2 rounded hover:text-white hover:bg-secondary-bg"
          >
            Legg til spørsmål
          </button>
        </div>
      </div >
      </div >
    </>
  );
}