import { Drawer } from 'expo-router/drawer';
import { useTheme } from 'react-native-paper';

import { useLobbyCode } from '@/hooks/use-lobby-code';

export default function DungeonMasterLayout() {
  const theme = useTheme();
  const code = useLobbyCode();

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        drawerStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ title: code ? `Party · ${code}` : 'Party', drawerLabel: 'Party' }}
      />
      <Drawer.Screen
        name="monsters"
        options={{ title: 'Monsters / NPCs', drawerLabel: 'Monsters / NPCs' }}
      />
      <Drawer.Screen name="chat" options={{ title: 'Chat', drawerLabel: 'Chat' }} />
      <Drawer.Screen name="notes" options={{ title: 'Notes', drawerLabel: 'Notes' }} />
      <Drawer.Screen
        name="compendium"
        options={{ title: 'Compendium', drawerLabel: 'Compendium' }}
      />
    </Drawer>
  );
}
