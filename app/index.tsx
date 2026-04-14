import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { user, isLoading: authLoading } = useAuth();

  // Show a loading spinner while Firebase Auth resolves
  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // Not authenticated → Login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Authenticated → App
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
