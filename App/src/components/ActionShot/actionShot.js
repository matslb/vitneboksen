import React, { useState, useEffect } from "react";
import queryString from "query-string";
import {
  getSharedSession,
  uploadActionShot,
} from "../../Services/vitneboksService";
import "./actionShot.css";
import { GetRecordingConstrains, prepFile } from "../../utilities";

const ActionShot = () => {
  const [videoStream, setVideoStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState();
  const [sharedKey, setSharedKey] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sessionName, setSessionName] = useState();
  const recordTime = 10000;
  const waitTime = 30000;
  const waitTimeBeforeRecord = 5000;

  useEffect(() => {
    if (sharedKey != null)
      setIsActive(
        getSharedSession(sharedKey).then((res) => {
          setSessionName(res);
          setIsActive(res !== false);
        })
      );
  }, [sharedKey]);

  useEffect(() => {
    let parsed = queryString.parse(window.location.search);
    if (parsed?.session) {
      setSharedKey(parsed.session);
    }
  }, []);

  useEffect(() => {
    if (videoStream && !recording) {
      videoStream.getTracks().forEach((track) => track.stop());
    }
  }, [recording, videoStream]);

  const countDownToRecording = async () => {
    setCountdown(waitTimeBeforeRecord / 1000);
    let countdownInterval = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
    }, 1000);

    setTimeout(() => {
      clearInterval(countdownInterval);
      startRecording();
    }, waitTimeBeforeRecord);
  };

  const startRecording = async () => {
    setRecording(true);
    setCountdown(recordTime / 1000);

    try {
      let countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);

      let stream;

      await navigator.mediaDevices
        .getUserMedia(await GetRecordingConstrains())
        .then((s) => {
          stream = s;
        })
        .catch((e) => console.error(e));

      setVideoStream(stream);

      const recorder = new MediaRecorder(stream);

      const recordedChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const { blob: videoBlob, fileName: videoFileName } = prepFile(
          recordedChunks,
          "mp4"
        );
        await uploadActionShot(sharedKey, videoBlob, videoFileName);
      };

      // Assign the stream to the video element
      const videoElement = document.getElementById("video");
      if ("srcObject" in videoElement) {
        videoElement.srcObject = stream;
      } else {
        // For older browsers that don't support srcObject
        videoElement.src = URL.createObjectURL(stream);
      }

      // Mute the video
      videoElement.muted = true;

      recorder.start();

      setTimeout(() => {
        clearInterval(countdownInterval);
        recorder.stop();
        setRecording(false);
        setWaiting(true);
        videoElement.srcObject = null;

        setCountdown(waitTime / 1000);

        countdownInterval = setInterval(() => {
          setCountdown((prevCountdown) => prevCountdown - 1);
        }, 1000);

        setTimeout(() => {
          clearInterval(countdownInterval);
          setWaiting(false);
        }, waitTime); //wait
      }, recordTime); // Record
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  return isActive === false ? (
    <div>
      <h1>
        Huffda, ser ut som denne vitneboksen ikke finnes, eller har blitt lukket
      </h1>
    </div>
  ) : (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          margin: "auto",
          width: "100%",
          height: "100%",
        }}
      >
        {recording && (
          <div
            style={{
              position: "absolute",
              top: "2%",
              left: "2%",
              fontSize: "2rem",
              display: "flex",
              background: "rgba(0,0,0,0.3)",
              padding: "1rem",
              zIndex: 99,
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                padding: "2px",
                borderRadius: "50%",
                backgroundColor: "red",
                animation: "blinker 1s infinite",
              }}
            />
            <div style={{ color: "white" }}>REC</div>
          </div>
        )}
        {recording && countdown > 0 && (
          <div
            style={{
              position: "absolute",
              top: "2%",
              right: "2%",
              fontSize: "2rem",
              display: "flex",
              background: "rgba(0,0,0,0.3)",
              padding: "1rem",
              zIndex: 99,
            }}
          >
            {countdown}
          </div>
        )}
        <video
          id="video"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
          playsInline
          muted
          autoPlay
        />
      </div>

      <div
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          height: "60vh",
          width: "100vw",
          zIndex: 2, // Higher zIndex to ensure it's on top of the video
        }}
      >
        {!recording && !waiting && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-evenly",
              alignItems: "center",
              textAlign: "center",
              height: "100%",
            }}
          >
            <div>
              <span>Velkommen til</span>
              <h1 style={{ fontSize: "3rem" }}>Vitneboksen</h1>
            </div>
            <span style={{ fontSize: "2rem" }}>🎉</span>
            <div>
              <span style={{ fontSize: "1.1rem" }}>De som arrangerer</span>
              <h2 style={{ fontSize: "2rem" }}>{sessionName}</h2>
              <span style={{ fontSize: "1.1rem" }}>
                syns du er kul nok til få denne linken
              </span>
            </div>
            {!countdown && (
              <div>
                <div style={{ fontSize: "1.1rem" }}>
                  {" "}
                  Ikke vær døll.
                  <br /> Send inn en liten videohilsen!
                </div>
                <br />
                <div>
                  <button
                    onClick={countDownToRecording}
                    style={{
                      cursor: "pointer",
                      padding: "10px 20px",
                      fontSize: "16px",
                      borderRadius: "10px",
                      border: "none",
                      color: "#000",
                      outline: "none",
                    }}
                  >
                    Spill inn
                  </button>
                </div>
              </div>
            )}
            {!recording && countdown && (
              <div style={{ fontSize: "1.2rem" }}>
                <span>Gjør deg klar!</span>
                <br />
                <span>Opptaket starter om {countdown} sekunder</span>
              </div>
            )}
          </div>
        )}
        {waiting && !recording && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "1.6rem",
              width: "30rem",
              maxWidth: "90vw",
              color: "#fff",
              zIndex: 4, // Higher zIndex to ensure it's on top of the video
            }}
          >
            <h2>Takk for ditt bidrag</h2>
            <br />
            Vitneboksen åpner igjen om {countdown} sekunder
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionShot;
