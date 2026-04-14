import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export function Disclaimer() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.light.accent} />
      </View>
      <Text style={styles.text}>
        <Text style={styles.textBold}>Not Medical Advice: </Text>
        Gleam optimization is for informational purposes only. Information provided is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always consult with your healthcare provider.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 20,
    borderRadius: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(216, 184, 136, 0.3)', // Using Gold Spark subtly
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    marginLeft: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#687076',
    lineHeight: 18,
  },
  textBold: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.text,
  }
});
