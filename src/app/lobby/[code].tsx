import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useLobbyCode } from '@/hooks/use-lobby-code';

export default function LobbyRoute() {
  const code = useLobbyCode();
  return (
    <PlaceholderScreen
      title="Lobby"
      description="Shows the code, the players who have joined, and the host control that starts the adventure countdown."
      meta={code ? `Code ${code}` : undefined}
    />
  );
}
