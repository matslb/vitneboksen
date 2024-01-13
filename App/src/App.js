import React, { useState, useEffect } from "react";
import queryString from "query-string";
import Home from "./components/Home/home";
import "./App.css";
import ActionShot from "./components/ActionShot/actionShot";

const App = () => {
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    let parsed = queryString.parse(window.location.search);
    if (parsed?.session) {
      setSessionId(parsed.session);
    }
  }, []);

  return (
    <div>
      {sessionId ? <ActionShot /> : <Home />}
      <div
        className="footer"
        style={{
          position: "fixed",
          display: "flex",
          bottom: "0",
          left: "5%",
          right: "5%",
        }}
      >
        <p
          style={{
            bottom: "0",
            left: "5%",
            alignItems: "baseline",
            alignContent: "baseline",
          }}
        >
          Sponset av
          <a href="https://spritjakt.no">
            <img
              src="spritjakt.png"
              alt="spritjakt logo"
              style={{ margin: "5px" }}
              height={"25px"}
            />
          </a>
          og
          <a href="https://erdetfesthosmatsikveld.no">
            erdetfesthosmatsikveld.no
          </a>
        </p>
        <p
          style={{
            right: "0%",
            left: "0%",
            bottom: "0",
            marginLeft: "auto",
            marginRight: "auto",
            alignItems: "baseline",
            alignContent: "baseline",
            gap: "10px",
          }}
        >
          © 2024{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://no.linkedin.com/in/mats-l%C3%B8vstrand-berntsen-4682b2142"
          >
            Mats Løvstrand Berntsen
          </a>
        </p>
        <p
          style={{
            display: "flex",
            bottom: "0",
            right: "5%",
            alignItems: "baseline",
            alignContent: "baseline",
            gap: "10px",
          }}
        >
          Kildekoden finner du på
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/matslb/vitneboksen"
          >
            Github
          </a>
        </p>
      </div>
    </div>
  );
};

export default App;
