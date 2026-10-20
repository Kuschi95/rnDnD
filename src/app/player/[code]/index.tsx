import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useLobbyCode } from '@/hooks/use-lobby-code';

export default function SheetRoute() {
  const code = useLobbyCode();
  return (
    <PlaceholderScreen
      title="Character sheet"
      description="Attributes, gold, class, and the button that opens the private chat with the dungeon master."
      meta={code ? `Lobby ${code}` : undefined}
    />
  );
}
