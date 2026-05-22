import React from "react";
import { ref, set, Database } from "firebase/database";
import type {Vitneboks} from "../types/Vitneboks";
import type { User } from "firebase/auth";
import ToggleSwitch from "./ToggleSwitch";

interface ActionShotSettingsProps {
  vitneboks: Vitneboks;
  user: User;
  db: Database;
}

const ActionShotSettings: React.FC<ActionShotSettingsProps> = ({ vitneboks, user, db }) => {
  const id = vitneboks.id;

  return (
      <div className="flex flex-col gap-4 my-4 p-4 bg-white/5 rounded shadow-inner">
        <h2 className="text-xl font-semibold">Mobilinnstillinger</h2>
          <p>Når gjestene dine åpner Vitnebokslinken på mobilen får de en forenklet visning. De fyller inn navnet sitt og sender inn en videohilsen uten å få spørsmål.</p>
        <div className="flex flex-row justify-evenly gap-4 my-4 p-4 bg-white/5 rounded shadow-inner">
          <div className="flex items-center gap-10 w-1/2">
            <span>Tillat videoer på mobil</span>
            <ToggleSwitch
              checked={vitneboks.allowActionShots ?? true}
              onChange={(checked) =>
                set(ref(db, `${user.uid}/vitnebokser/${id}/allowActionShots`), checked)
              }
            />
          </div>
          <div className="flex items-center gap-10  w-1/2">
            <span>Opptakstid</span>
            <select
              value={vitneboks.actionShotDuration ?? 10}
              onChange={(e) =>
                set(
                  ref(db, `${user.uid}/vitnebokser/${id}/actionShotDuration`),
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
      </div>
  );
};

export default ActionShotSettings;
