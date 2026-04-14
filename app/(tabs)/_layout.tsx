import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/context/ProfileContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hasOnboarded } = useProfile();

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: '#E8E6DF',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Daily Rhythm',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="leaf" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Cabinet',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="albums" color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="analytics" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
