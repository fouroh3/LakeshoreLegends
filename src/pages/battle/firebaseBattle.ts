import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase";

export type GuildActionType =
  | "WAITING"
  | "ATTACK"
  | "HEAL";

export async function submitGuildAction(params: {
  sessionId: string;
  homeroom: string;
  guild: string;
  action: GuildActionType;
  round: number;
}) {
  const id = [
    params.sessionId,
    params.round,
    params.homeroom,
    params.guild,
  ].join("_");

  await setDoc(
    doc(db, "guildActions", id),
    {
      sessionId: params.sessionId,
      homeroom: params.homeroom,
      guild: params.guild,
      action: params.action,
      round: params.round,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeGuildActions(
  sessionId: string,
  callback: (actions: any[]) => void
) {
  return onSnapshot(
    collection(db, "guildActions"),
    (snapshot) => {
      const rows = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .filter(
          (r: any) =>
            String(r.sessionId || "") === String(sessionId)
        );

      callback(rows);
    }
  );
}