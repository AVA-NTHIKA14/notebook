import { useEffect, useState, useCallback } from "react";
import { db } from "./firebase";
import { collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { saveImage, getImages } from "./indexedDB";

export default function Notes({ user }) {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);

  const loadNotes = useCallback(async () => {
    if (!user) return;

    const q = query(
      collection(db, "notes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const textNotes = snap.docs.map(d => d.data());

    const images = await getImages(user.uid);
    const imageNotes = images.map(img => ({
      type: "image",
      content: img.data,
      createdAt: img.createdAt
    }));

    setNotes([...imageNotes, ...textNotes].sort((a, b) => b.createdAt - a.createdAt));
  }, [user]);

  const saveText = async () => {
    if (!text.trim()) return;

    await addDoc(collection(db, "notes"), {
      userId: user.uid,
      type: "text",
      content: text,
      createdAt: Date.now()
    });

    setText("");
    loadNotes();
  };

  const handlePaste = async (e) => {
    for (let item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        const reader = new FileReader();

        reader.onload = async () => {
          await saveImage({
            id: Date.now(),
            userId: user.uid,
            data: reader.result,
            createdAt: Date.now()
          });
          loadNotes();
        };

        reader.readAsDataURL(file);
        return;
      }
    }
  };

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  if (!user) return null;

  return (
    <div style={{ padding: 20 }}>
      <h2>Your Study Notes</h2>

      <textarea
        rows={4}
        value={text}
        placeholder="Type notes or paste screenshot (Ctrl+V)"
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        style={{ width: "100%", maxWidth: 600 }}
      />

      <br /><br />
      <button onClick={saveText}>Save Text</button>

      <hr />

      {notes.map((n, i) =>
        n.type === "text" ? (
          <p key={i}>{n.content}</p>
        ) : (
          <img
            key={i}
            src={n.content}
            alt=""
            style={{ maxWidth: 400, display: "block", marginBottom: 10 }}
          />
        )
      )}
    </div>
  );
}
