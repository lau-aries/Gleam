import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCabinet } from '@/context/CabinetContext';

const TIMEFRAMES = [
  { id: '1w', label: '1W', title: "This Week's Consistency" },
  { id: '1m', label: '1M', title: "This Month's Consistency" },
  { id: '6m', label: '6M', title: "6-Month Consistency" },
  { id: '1y', label: '1Y', title: "1-Year Consistency" },
  { id: '5y', label: '5Y', title: "5-Year Consistency" },
];

const MOCK_DATA: Record<string, { day: string, score: number }[]> = {
  '1w': [
    { day: 'Mon', score: 80 }, { day: 'Tue', score: 100 }, { day: 'Wed', score: 65 }, 
    { day: 'Thu', score: 90 }, { day: 'Fri', score: 100 }, { day: 'Sat', score: 50 }, { day: 'Sun', score: 85 }
  ],
  '1m': [
    { day: 'W1', score: 75 }, { day: 'W2', score: 85 }, { day: 'W3', score: 90 }, { day: 'W4', score: 88 }
  ],
  '6m': [
    { day: 'Oct', score: 60 }, { day: 'Nov', score: 70 }, { day: 'Dec', score: 75 }, 
    { day: 'Jan', score: 85 }, { day: 'Feb', score: 90 }, { day: 'Mar', score: 82 }
  ],
  '1y': [
    { day: 'J', score: 65 }, { day: 'F', score: 70 }, { day: 'M', score: 80 }, 
    { day: 'A', score: 85 }, { day: 'M', score: 90 }, { day: 'J', score: 95 },
    { day: 'J', score: 80 }, { day: 'A', score: 85 }, { day: 'S', score: 88 },
    { day: 'O', score: 75 }, { day: 'N', score: 65 }, { day: 'D', score: 82 }
  ],
  '5y': [
    { day: '22', score: 40 }, { day: '23', score: 60 }, { day: '24', score: 75 }, { day: '25', score: 85 }, { day: '26', score: 82 }
  ]
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { cabinetItems } = useCabinet();
  
  const [activeFrame, setActiveFrame] = useState('1w');
  const [selectedSupp, setSelectedSupp] = useState<string>('all');
  
  const selectedName = selectedSupp === 'all' ? undefined : cabinetItems.find(c => c.id === selectedSupp)?.name;
  const scoreOffset = selectedSupp === 'all' ? 0 : ((selectedName?.length || 0) * 3 % 20) - 10;
  
  const currentData = MOCK_DATA[activeFrame].map(d => ({
    day: d.day,
    score: Math.min(100, Math.max(0, d.score + scoreOffset))
  }));
  
  const currentTitle = TIMEFRAMES.find(t => t.id === activeFrame)?.title;
  const avg = Math.round(currentData.reduce((a, b) => a + b.score, 0) / currentData.length);

  // Dynamic fallback mock metrics
  const streakDays = selectedSupp === 'all' ? 12 : Math.abs(((selectedName?.length || 0) * 7) % 30) + 2;
  const trendPercent = selectedSupp === 'all' ? 15 : ((selectedName?.length || 0) * 11) % 40 - 10;
  const isPositiveTrend = trendPercent >= 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.light.background, '#FFFFFF']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>
            {selectedName ? `Adherence for ${selectedName}` : 'Overall adherence journey'}
          </Text>
        </View>

        {/* Supplement Filter Selector */}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
             <TouchableOpacity 
               style={[styles.filterChip, selectedSupp === 'all' && styles.filterChipActive]}
               onPress={() => setSelectedSupp('all')}
               activeOpacity={0.8}
             >
               <Text style={[styles.filterText, selectedSupp === 'all' && styles.filterTextActive]}>All Protocols</Text>
             </TouchableOpacity>

             {cabinetItems.map(item => (
               <TouchableOpacity 
                 key={item.id}
                 style={[styles.filterChip, selectedSupp === item.id && styles.filterChipActive]}
                 onPress={() => setSelectedSupp(item.id)}
                 activeOpacity={0.8}
               >
                 <Text style={[styles.filterText, selectedSupp === item.id && styles.filterTextActive]}>{item.name}</Text>
               </TouchableOpacity>
             ))}
          </ScrollView>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeSelector}>
           {TIMEFRAMES.map(tf => (
              <TouchableOpacity 
                key={tf.id} 
                style={[styles.tfButton, activeFrame === tf.id && styles.tfButtonActive]}
                onPress={() => setActiveFrame(tf.id)}
                activeOpacity={0.8}
              >
                 <Text style={[styles.tfText, activeFrame === tf.id && styles.tfTextActive]}>{tf.label}</Text>
              </TouchableOpacity>
           ))}
        </View>

        {/* Dynamic Chart Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{currentTitle}</Text>
          <View style={styles.chartContainer}>
            {currentData.map((data, index) => (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.barBackground, currentData.length > 7 ? { width: 8 } : { width: 12 }]}>
                   <View style={[styles.barFill, { height: `${data.score}%`, backgroundColor: data.score === 100 ? Colors.light.primary : '#D4AF37' }]} />
                </View>
                <Text style={[styles.dayLabel, currentData.length > 7 && { fontSize: 10 }]}>{data.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterText}>Average Adherence: {avg}%</Text>
          </View>
        </View>

        {/* Milestone Card */}
        <View style={styles.milestoneCard}>
          <View style={styles.insightIconWrapper}>
             <Ionicons name="calendar" size={20} color={Colors.light.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.milestoneTitle}>
              {selectedName ? `Tracking ${selectedName}` : 'Gleam Journey Started'}
            </Text>
            <Text style={styles.milestoneValue}>
              {selectedName ? 'Since Jan 2026 (3 Months)' : 'Since Aug 2025 (8 Months)'}
            </Text>
          </View>
        </View>

        {/* Trends */}
        <View style={styles.row}>
          <View style={[styles.trendCard, { marginRight: 8 }]}>
             <Ionicons name="flame" size={24} color="#E53935" style={{ marginBottom: 8 }} />
             <Text style={styles.trendValue}>{streakDays} days</Text>
             <Text style={styles.trendLabel}>Longest Streak</Text>
          </View>
          <View style={[styles.trendCard, { marginLeft: 8 }]}>
             <Ionicons name={isPositiveTrend ? "trending-up" : "trending-down"} size={24} color={isPositiveTrend ? Colors.light.primary : "#E53935"} style={{ marginBottom: 8 }} />
             <Text style={[styles.trendValue, !isPositiveTrend && { color: "#E53935" }]}>
               {isPositiveTrend ? '+' : ''}{trendPercent}%
             </Text>
             <Text style={styles.trendLabel}>Vs Last Week</Text>
          </View>
        </View>

        {/* Detailed Insights */}
        <Text style={styles.subsectionTitle}>Noticeable Patterns</Text>
        
        <View style={styles.insightRow}>
          <View style={styles.insightIconWrapper}>
            <Ionicons name="time" size={20} color="#D4AF37" />
          </View>
          <View style={styles.insightTextContent}>
            <Text style={styles.insightTitle}>Afternoon Slump</Text>
            <Text style={styles.insightDesc}>You most frequently skip your afternoon supplements. Consider moving them to breakfast.</Text>
          </View>
        </View>

        <View style={styles.insightRow}>
          <View style={styles.insightIconWrapper}>
            <Ionicons name="moon" size={20} color="#5C6BC0" />
          </View>
          <View style={styles.insightTextContent}>
            <Text style={styles.insightTitle}>Evening Perfection</Text>
            <Text style={styles.insightDesc}>You have a 100% adherence rate for your Evening Protocol over the past 30 days!</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'flex-start', // Left aligned
  },
  title: {
    fontSize: 38,
    color: Colors.light.text,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#687076',
    marginTop: 4,
  },
  filterWrapper: {
    marginHorizontal: -24,
    marginBottom: 20,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0EBE1',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
  },
  filterTextActive: {
    color: Colors.light.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  timeframeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBE1',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  tfButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  tfButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  tfText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
  },
  tfTextActive: {
    color: Colors.light.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#4A5546',
    marginBottom: 24,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barBackground: {
    height: 120,
    backgroundColor: '#F0EBE1',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
  },
  chartFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1',
    alignItems: 'center',
  },
  chartFooterText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#687076',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  trendCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  trendValue: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#2D3A28',
    marginBottom: 4,
  },
  trendLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
  },
  subsectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A9A83',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  insightIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9F8F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  insightTextContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#2D3A28',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#687076',
    lineHeight: 20,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  milestoneTitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  milestoneValue: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#2D3A28',
  }
});
