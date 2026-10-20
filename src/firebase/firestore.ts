import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirebaseApp } from '@/firebase/client';

export type RemoteDoc = {
  id: string;
  data: DocumentData;
};

function firestore() {
  return getFirestore(getFirebaseApp());
}

export async function setFirestoreDocument(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(firestore(), `${collectionPath}/${docId}`), data, { merge: true });
}

export async function deleteFirestoreDocument(
  collectionPath: string,
  docId: string,
): Promise<void> {
  await deleteDoc(doc(firestore(), `${collectionPath}/${docId}`));
}

export function subscribeFirestoreDocument(
  collectionPath: string,
  docId: string,
  onData: (doc: RemoteDoc | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore(), `${collectionPath}/${docId}`),
    (snapshot) => {
      onData(snapshot.exists() ? { id: snapshot.id, data: snapshot.data() } : null);
    },
    (error) => onError(error),
  );
}

export function subscribeFirestoreCollection(
  collectionPath: string,
  onData: (docs: RemoteDoc[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firestore(), collectionPath),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, data: item.data() })));
    },
    (error) => onError(error),
  );
}

/**
 * Same query as Kotlin `ChatViewModel.getMessagesBetweenUsers`:
 * senderId in [host, player] AND receiverId in [host, player] ORDER BY timestamp.
 * Needs the composite index in `firestore.indexes.json`.
 */
export function subscribeChatThread(input: {
  lobbyCode: string;
  hostId: string;
  playerId: string;
  onData: (docs: RemoteDoc[]) => void;
  onError: (error: Error) => void;
}): Unsubscribe {
  const participants = [input.hostId, input.playerId];
  const thread = query(
    collection(firestore(), 'lobbies', input.lobbyCode, 'chats'),
    where('senderId', 'in', participants),
    where('receiverId', 'in', participants),
    orderBy('timestamp'),
  );
  return onSnapshot(
    thread,
    (snapshot) => {
      input.onData(snapshot.docs.map((item) => ({ id: item.id, data: item.data() })));
    },
    (error) => input.onError(error),
  );
}

/**
 * Unread check from Kotlin `listenForUnreadMessages`:
 * senderId ==, receiverId ==, read == false.
 */
export function subscribeUnreadChat(input: {
  lobbyCode: string;
  senderId: string;
  receiverId: string;
  onCount: (count: number) => void;
  onError: (error: Error) => void;
}): Unsubscribe {
  const unread = query(
    collection(firestore(), 'lobbies', input.lobbyCode, 'chats'),
    where('senderId', '==', input.senderId),
    where('receiverId', '==', input.receiverId),
    where('read', '==', false),
  );
  return onSnapshot(
    unread,
    (snapshot) => input.onCount(snapshot.size),
    (error) => input.onError(error),
  );
}
