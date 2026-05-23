import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue, set, remove, update } from "firebase/database";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { FinalVideoStatus, GetVitneboksRef, type Vitneboks } from "../types/Vitneboks";

import LoadingFullScreen from "../components/LoadingFullScreen";
import Footer from "../components/Footer";
import {
  deleteVitneboks,
  forceUpdateVitneboksStatus,
} from "../vitneboksService";
import Header from "../components/Header";
import DesktopSettings from "../components/DesktopSettings.tsx";
import PencilIcon from "../components/PencilIcon";
import { mapVitneboks, vitneboksTimeRemaining } from "../utils";
import TimelineEditor from "../components/TimelineEditor";
import VitneboksLink from "../components/VitneboksLink";
import { GetPublicVitneboksRef } from "../types/PublicVitneboks";
import MobileSettings from "../components/MobileSettings.tsx";

export default function VitneboksDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vitneboks, setVitneboks] = useState<Vitneboks | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const auth = getAuth();
  const db = getDatabase();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;

    const lastUpdateKey = `lastUpdateStatus_${id}`;
    const lastUpdate = localStorage.getItem(lastUpdateKey);
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (!lastUpdate || now - parseInt(lastUpdate) > tenMinutes) {
      forceUpdateVitneboksStatus(id);
      localStorage.setItem(lastUpdateKey, now.toString());
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (vitneboks === null) return;

    const publicVitneboksRef = GetPublicVitneboksRef(db, vitneboks.id);
    const publicVitneboks = {
      id: vitneboks.id,
      title: vitneboks.title,
      maxStorage: vitneboks.maxStorage,
      finalVideoProcessingStatus: vitneboks.finalVideoProcessingStatus,
      questions: vitneboks.questions,
      isOpen: vitneboks.isOpen,
      sessionStorageUsage: vitneboks.sessionStorageUsage,
      allowActionShots: vitneboks.allowActionShots ?? true,
      actionShotDuration: vitneboks.actionShotDuration ?? 10
    };
    update(publicVitneboksRef, publicVitneboks);

  }, [vitneboks, db]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const vbRef = GetVitneboksRef(db, user.uid, id);
    onValue(vbRef, (snapshot) => {
      const data: Vitneboks = snapshot.val();
      if (!data) {
        navigate("/admin");
        return;
      }
      data.failedVideoIds ??= [];
      setVitneboks(mapVitneboks(data));
    });
  }, [user, id, db, navigate]);

  if (!user || !vitneboks) return <LoadingFullScreen />;

  const handleDeleteVitneboks = async () => {
    if (!user?.uid || !id) return;

    if (
      !confirm(
        "Er du sikker på at du vil slette denne vitneboksen? Dette kan ikke angres."
      )
    )
      return;
    await deleteVitneboks(id);

    remove(GetVitneboksRef(db, user.uid, id));
    remove(GetPublicVitneboksRef(db, id));

    navigate("/admin");
  };

  return (
    <>
      <div className="bg-primary-bg min-h-screen">
        <Header backButtonPath={"/admin/"} />
        <div className="flex flex-col items-center text-primary-text p-2">
          <div className="relative mb-8 bg-secondary-bg w-full max-w-5xl p-4 md:p-8 shadow-md rounded">
            <div className="flex justify-between items-center bg-white/10 px-4 py-2 ">
              <div className="flex items-center gap-2">

                <p className="text-xl font-bold my-4 ">
                  <input
                      ref={inputRef}
                      type="text"
                      name="title"
                      maxLength={45}
                      className="bg-transparent border-none focus:bg-white focus:text-black focus:outline-none px-2 py-1 rounded transition-colors"
                      value={vitneboks.title}
                      onChange={(e) =>
                          set(
                              ref(db, `${user.uid}/vitnebokser/${id}/title`),
                              e.currentTarget.value
                          )
                      }
                  />
                </p>
              </div>
              <button
                  onClick={() => inputRef.current?.focus()}
                  className="hover:opacity-100 transition-opacity bg-primary-button text-black p-2 rounded hover:bg-secondary-bg "
                  aria-label="Endre tittel"
              >
                <PencilIcon className="h-5 w-5 opacity-70" />
              </button>
            </div>

            <TimelineEditor vitneboks={vitneboks} />
            <VitneboksLink vitneboksId={vitneboks.id} />
            <DesktopSettings
              vitneBoksId={vitneboks.id}
              userId={user.uid}
              vitneboksIsOpen={vitneboks.isOpen}
              questions={vitneboks.questions}
              actionShotDuration={vitneboks.actionShotDuration || 10}
            />
            <MobileSettings vitneboks={vitneboks} user={user} db={db} />
            <div className="flex justify-between items-end gap-4">
              <p className="opacity-80">
                {vitneboks.deletionFromDate && (
                  <>
                    Slettes automatisk om{" "}
                    {vitneboksTimeRemaining(vitneboks.deletionFromDate)}
                  </>
                )}
              </p>
              {vitneboks.finalVideoProcessingStatus ==
                FinalVideoStatus.started ||
                vitneboks.videosToBeProcessed > 0 ? (
                <button
                  onClick={handleDeleteVitneboks}
                  disabled={true}
                  className="bg-danger/50 text-white/50 cursor-not-allowed px-4 py-2 rounded"
                >
                  Slett vitneboks
                </button>
              ) : (
                <button
                  onClick={handleDeleteVitneboks}
                  className="bg-danger text-white px-4 py-2 rounded"
                >
                  Slett vitneboks
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
