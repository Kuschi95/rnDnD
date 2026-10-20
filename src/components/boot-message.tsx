import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

type BootMessageProps = {
  title: string;
  body?: string;
  busy?: boolean;
};

export function BootMessage({ title, body, busy = false }: BootMessageProps) {
  return (
    <View style={styles.container}>
      {busy ? <ActivityIndicator /> : null}
      <Text variant="titleMedium">{title}</Text>
      {body ? <Text variant="bodyMedium">{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F4EFE4',
  },
});
