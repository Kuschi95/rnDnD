import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  meta?: string;
};

export function PlaceholderScreen({ title, description, meta }: PlaceholderScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
        Placeholder
      </Text>
      <Text variant="headlineMedium">{title}</Text>
      <Text variant="bodyLarge" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {description}
      </Text>
      {meta ? <Text variant="titleMedium">{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  body: {
    lineHeight: 24,
  },
});
