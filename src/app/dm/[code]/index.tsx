import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useLobbyCode } from '@/hooks/use-lobby-code';

export default function PartyRoute() {
  const code = useLobbyCode();
  return (
    <PlaceholderScreen
      title="Party"
      description="The host's view of the lobby characters, including the editor for a player's sheet."
      meta={code ? `Lobby ${code}` : undefined}
    />
  );
}
