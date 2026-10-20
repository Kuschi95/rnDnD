import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ChatRoute() {
  return (
    <PlaceholderScreen
      title="Chat"
      description="Private threads between the host and each player, with an unread marker. Needs the chat composite indexes before it talks to Firestore."
    />
  );
}
