import { Drawer } from 'expo-router/drawer';
import { useTheme } from 'react-native-paper';

import { useLobbyCode } from '@/hooks/use-lobby-code';

export default function PlayerLayout() {
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
        options={{ title: code ? `Sheet · ${code}` : 'Sheet', drawerLabel: 'Sheet' }}
      />
      <Drawer.Screen name="inventory" options={{ title: 'Inventory', drawerLabel: 'Inventory' }} />
      <Drawer.Screen name="abilities" options={{ title: 'Abilities', drawerLabel: 'Abilities' }} />
      <Drawer.Screen name="armour" options={{ title: 'Armour', drawerLabel: 'Armour' }} />
      <Drawer.Screen name="monsters" options={{ title: 'Monsters', drawerLabel: 'Monsters' }} />
      <Drawer.Screen name="notes" options={{ title: 'Notes', drawerLabel: 'Notes' }} />
    </Drawer>
  );
}
