function generateKey() {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateSession() {
  const sessionKey = localStorage.getItem("sessionKey") || generateKey();

  const urlWithQueryParam = `${process.env.REACT_APP_API}get-session?sessionKey=${sessionKey}`;
  try {
    const response = await fetch(urlWithQueryParam, { method: "GET" });

    if (!response.ok) {
      console.log(response.error);
    }
    const body = await response.json();
    return body;
  } catch (error) {
    console.error("Error:", error);
  }
}

export async function startFinalVideoProcessing(sessionKey, sessionName) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}start-final-video-processing?sessionKey=${sessionKey}&sessionName=${sessionName}`;
  var response = await fetch(urlWithQueryParam, { method: "GET" });
  if (response.ok) {
    return true;
  }
  return false;
}

export async function getSharedSession(sharedKey) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}get-shared-session?sharedKey=${sharedKey}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET",
  });

  if (response.ok) {
    return response.json();
  }
  return false;
}

export async function uploadTestimony(
  sessionKey,
  videofile,
  videoName,
  subText
) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}upload-testimony?sessionKey=${sessionKey}`;
  const formData = new FormData();
  formData.append("video", videofile, videoName);
  formData.append("sub", subText);
  await uploadFile(urlWithQueryParam, formData);
}

export async function uploadActionShot(sharedKey, videofile, videoName) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}upload-actionshot?sharedKey=${sharedKey}`;
  const formData = new FormData();
  formData.append("video", videofile, videoName);
  await uploadFile(urlWithQueryParam, formData);
}

export async function deleteSession(sessionKey) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}delete-session?sessionKey=${sessionKey}`;

  try {
    await fetch(urlWithQueryParam, {
      method: "DELETE",
    });
  } catch (error) {
    console.log(error);
  }
  return true;
}

export async function updateSessionName(sessionKey, name) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}set-name?sessionKey=${sessionKey}&name=${name}`;
  const response = await fetch(urlWithQueryParam, {
    method: "GET",
  });

  if (response.ok) {
    return true;
  }
  return false;
}

export async function updateQuestions(sessionKey, questions) {
  const urlWithQueryParam = `${process.env.REACT_APP_API}set-questions?sessionKey=${sessionKey}`;
  const response = await fetch(urlWithQueryParam, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(questions),
  });

  if (response.ok) {
    return true;
  }
  return false;
}

async function uploadFile(url, formData) {
  const handleBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
    } else {
      console.error("Failed to upload file");
    }
  } catch (error) {
    console.error("Error:", error);
  }

  window.removeEventListener("beforeunload", handleBeforeUnload);
}
