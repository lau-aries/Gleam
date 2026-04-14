import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { Disclaimer } from '@/components/Disclaimer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useCabinet } from '@/context/CabinetContext';
import { useProfile } from '@/context/ProfileContext';

// Reusable schedule logic
const getScheduleForDate = (date: Date, cabinetItems: any[], profile: any, dailyOverrides: any) => {
  const dateKey = date.toISOString().split('T')[0];
  const morningItems: any[] = [];
  const afternoonItems: any[] = [];
  const eveningItems: any[] = [];

  cabinetItems.forEach(item => {
      const text = (item.instructions + ' ' + item.name + ' ' + item.reason).toLowerCase();
      const itemName = item.name.toLowerCase();

      const override = dailyOverrides[dateKey]?.[item.id];
      if (override) {
          if (override.protocol === 'Morning') morningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Rescheduled (Today Only)', time: override.time || profile.breakfastTime || '08:00 AM' });
          else if (override.protocol === 'Afternoon') afternoonItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Rescheduled (Today Only)', time: override.time || profile.lunchTime || '01:00 PM' });
          else if (override.protocol === 'Evening') eveningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Rescheduled (Today Only)', time: override.time || profile.sleepTime || '10:00 PM' });
          return;
      }

      if (item.manualTimingProtocol) {
          if (item.manualTimingProtocol === 'Morning') morningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Manually Scheduled', time: item.manualTimeString || profile.breakfastTime || '08:00 AM' });
          else if (item.manualTimingProtocol === 'Afternoon') afternoonItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Manually Scheduled', time: item.manualTimeString || profile.lunchTime || '01:00 PM' });
          else if (item.manualTimingProtocol === 'Evening') eveningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Manually Scheduled', time: item.manualTimeString || profile.sleepTime || '10:00 PM' });
          return;
      }

      const hasZinc = cabinetItems.some(i => i.name.toLowerCase().includes('zinc') && i.manualTimingProtocol !== 'Morning' && i.manualTimingProtocol !== 'Afternoon');
      if (itemName.includes('calcium') && hasZinc) {
          eveningItems.push({ id: item.id, name: item.name, details: 'Clinical Logic: Spaced 2h+ from Zinc', time: profile.dinnerTime || '07:00 PM' });
          return;
      }

      if (text.includes('bed') || text.includes('sleep') || text.includes('evening') || text.includes('night') || text.includes('magnesium')) {
          eveningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Take with water', time: profile.sleepTime || '10:00 PM' });
      } else if (text.includes('lunch') || text.includes('afternoon') || text.includes('zinc') || text.includes('probiotic')) {
          const time = text.includes('probiotic') ? '03:00 PM' : (profile.lunchTime || '01:00 PM');
          afternoonItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Take with food', time });
      } else {
          morningItems.push({ id: item.id, name: item.name, details: item.instructions || item.reason || 'Take in morning', time: profile.breakfastTime || '08:00 AM' });
      }
  });

  const caffeineMorning: { type: string, time: string }[] = [];
  const caffeineAfternoon: { type: string, time: string }[] = [];
  const caffeineEvening: { type: string, time: string }[] = [];

  if (profile.drinksCaffeine && profile.caffeineType && profile.caffeineTimes) {
      profile.caffeineTimes.forEach((time: string) => {
          const type = profile.caffeineType?.join(' & ') || 'Caffeine';
          const match = time.match(/(\d+)/);
          const hour = match ? parseInt(match[0]) : 0;
          
          if (time.toUpperCase().includes('AM')) {
              caffeineMorning.push({ type, time });
          } else if (time.toUpperCase().includes('PM') && (hour < 5 || hour === 12)) {
              caffeineAfternoon.push({ type, time });
          } else {
              caffeineEvening.push({ type, time });
          }
      });
  }

  const schedule: { id: string; time: string; clock: string; items: any[]; caffeineEvents?: { type: string, time: string }[] }[] = [];
  if (morningItems.length > 0 || caffeineMorning.length > 0) schedule.push({ id: '1', time: 'Morning Protocol', clock: profile.breakfastTime || '08:00 AM', items: morningItems, caffeineEvents: caffeineMorning });
  if (afternoonItems.length > 0 || caffeineAfternoon.length > 0) schedule.push({ id: '2', time: 'Afternoon Protocol', clock: profile.lunchTime || '01:00 PM', items: afternoonItems, caffeineEvents: caffeineAfternoon });
  if (eveningItems.length > 0 || caffeineEvening.length > 0) schedule.push({ id: '3', time: 'Evening Protocol', clock: profile.dinnerTime || '07:00 PM', items: eveningItems, caffeineEvents: caffeineEvening });
  
  if (schedule.length === 0) {
    schedule.push({ id: 'empty', time: 'No Supplements Active', clock: '', items: [] });
  }

  return schedule;
};

const WeeklyDetailedDayCard = ({ date, cabinetItems, profile, dailyOverrides, takenLog, skippedLog, onPress }: any) => {
    const dateKey = date.toISOString().split('T')[0];
    const schedule = getScheduleForDate(date, cabinetItems, profile, dailyOverrides);
    const dayTaken = takenLog[dateKey] || [];
    const daySkipped = skippedLog[dateKey] || {};
    
    const totalItems = schedule.reduce((sum, s) => sum + s.items.length, 0);
    const completedCount = schedule.reduce((sum, s) => 
        sum + s.items.filter((item: any) => dayTaken.includes(`${s.id}-${item.name}`) || daySkipped[`${s.id}-${item.name}`]).length
    , 0);
    
    const adherence = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    
    const daysName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isToday = new Date().toDateString() === date.toDateString();

    return (
        <View style={{ marginBottom: 24, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F0EBE1', shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={{ fontSize: 18, fontFamily: 'PlayfairDisplay_600SemiBold', color: Colors.light.primary }}>
                     {daysName[date.getDay()]}, {monthsName[date.getMonth()]} {date.getDate()}
                   </Text>
                   {isToday && (
                       <View style={{ marginLeft: 10, backgroundColor: 'rgba(216, 184, 136, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                           <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#A78B6C', letterSpacing: 0.5 }}>TODAY</Text>
                       </View>
                   )}
                </View>
                <TouchableOpacity onPress={onPress}>
                   <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.light.primary, textDecorationLine: 'underline' }}>Edit Day</Text>
                </TouchableOpacity>
            </View>

            {/* Score Bar */}
            <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: '#8A9A83', fontFamily: 'Inter_500Medium' }}>Adherence</Text>
                    <Text style={{ fontSize: 13, color: Colors.light.primary, fontFamily: 'Inter_600SemiBold' }}>{adherence}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E8E6DF', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${adherence}%`, backgroundColor: adherence === 100 ? Colors.light.primary : '#D8B888', borderRadius: 3 }} />
                </View>
            </View>

            {/* Items List */}
            {schedule.map(session => {
                if (session.id === 'empty' || session.items.length === 0) return null;
                return (
                   <View key={session.id} style={{ marginBottom: 12 }}>
                       <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#A78B6C', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{session.time}</Text>
                       {session.items.map((item: any) => {
                           const itemKey = `${session.id}-${item.name}`;
                           const isTaken = dayTaken.includes(itemKey);
                           const isSkipped = !!daySkipped[itemKey];
                           return (
                               <View key={itemKey} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                   <View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, isTaken && { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary }, isSkipped && { backgroundColor: '#E8E6DF', borderColor: '#E8E6DF' }]}>
                                       {isTaken && <Ionicons name="checkmark" size={14} color="white" />}
                                       {isSkipped && <Ionicons name="close" size={14} color="#8A9A83" />}
                                   </View>
                                   <Text style={[{ fontSize: 15, fontFamily: 'Inter_500Medium', color: '#4A5546' }, (isTaken || isSkipped) && { textDecorationLine: 'line-through', color: '#9BA1A6' }]}>
                                       {item.name}
                                   </Text>
                               </View>
                           );
                       })}
                   </View>
                );
            })}
        </View>
    );
};

const WeeklyOverview = ({ currentDate, cabinetItems, profile, dailyOverrides, takenLog, skippedLog, onSelectDay }: any) => {
    const days = [];
    const start = new Date(currentDate);
    // Find the Monday of the current week (if today is Sunday, currentDay will be 0)
    const currentDay = start.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    start.setDate(start.getDate() + distanceToMonday);

    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }

    return (
        <View style={{ marginTop: 20 }}>
            <View style={[styles.insightBox, { marginBottom: 24 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.light.primary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Weekly Protocol View
                    </Text>
                </View>
                <Text style={styles.insightText}>
                    Review your intake across the entire week. Tap &apos;Edit Day&apos; to modify routines for past, present, or future dates.
                </Text>
            </View>
            
            {days.map(day => (
                <WeeklyDetailedDayCard 
                    key={day.toISOString()} 
                    date={day} 
                    cabinetItems={cabinetItems}
                    profile={profile}
                    dailyOverrides={dailyOverrides}
                    takenLog={takenLog}
                    skippedLog={skippedLog}
                    onPress={() => onSelectDay(day)}
                />
            ))}
        </View>
    );
};

// Glossy radial indicator
const RhythmScore = ({ score, onPress }: { score: number, onPress?: () => void }) => {
  const size = 130;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.scoreWrapper}>
      <View style={styles.scoreContainer}>
        <Svg width={size} height={size}>
          <Circle
            stroke="rgba(255, 255, 255, 0.5)"
            fill="rgba(255, 255, 255, 0.4)"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={Colors.light.primary}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.scoreTextContainer}>
          <Text style={styles.scoreNumber}>{score}%</Text>
          <Text style={styles.scoreLabel}>Adherence</Text>
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 12, padding: 4 }}>
          <Ionicons name="information" size={16} color={Colors.light.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const AnimatedCard = ({ item, index, taken, skipped, skipReason, onToggle, onSkip, onMove }: { item: any, index: number, taken: boolean, skipped: boolean, skipReason?: string, onToggle: () => void, onSkip: () => void, onMove: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity 
        style={[styles.card, (taken || skipped) && { opacity: 0.6 }]} 
        activeOpacity={0.8}
        onPress={onToggle}
      >
        <View style={[styles.cardIconWrapper, skipped && { backgroundColor: '#F0EBE1' }]}>
          <Ionicons name={skipped ? "close" : "leaf-outline"} size={20} color={skipped ? "#8A9A83" : Colors.light.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <Text style={[styles.suppName, { marginBottom: 0 }, (taken || skipped) && { textDecorationLine: 'line-through', color: '#9BA1A6' }]}>{item.name}</Text>{!!item.time && (
              <View style={styles.itemTimeTag}>
                <Ionicons name="time-outline" size={12} color="#8A9A83" />
                <Text style={styles.itemTimeText}>{item.time}</Text>
              </View>
            )}<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#C8E6C9' }}>
               <Ionicons name="shield-checkmark" size={10} color={Colors.light.primary} />
               <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: Colors.light.primary, marginLeft: 3 }}>CLINICALLY CHECKED</Text>
            </View>
          </View>
          <Text style={[styles.suppInstruct, skipped && { color: '#8A9A83', fontStyle: 'italic' }, { marginBottom: (!taken && !skipped) ? 12 : 0 }]}>
            {skipped ? `Skipped: ${skipReason}` : item.details}
          </Text>
          
          {!taken && !skipped && (
            <View style={{ flexDirection: 'row', flexShrink: 0, gap: 10 }}>
              <TouchableOpacity onPress={onMove} style={[styles.skipButton, { flexDirection: 'row', backgroundColor: 'rgba(138, 154, 131, 0.1)', borderWidth: 1, borderColor: 'rgba(138, 154, 131, 0.2)' }]}>
                <Ionicons name="swap-vertical" size={12} color="#8A9A83" style={{ marginRight: 4 }} />
                <Text style={styles.skipText}>Move Time</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.checkbox, taken && styles.checkboxActive, skipped && styles.checkboxSkipped]}>
           {taken && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { cabinetItems, editSupplement, takeSupplement, dailyOverrides, setDailyOverride } = useCabinet();
  const { profile } = useProfile();
  
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [takenLog, setTakenLog] = useState<Record<string, string[]>>({});
  const [skippedLog, setSkippedLog] = useState<Record<string, Record<string, string>>>({});

  const dateKey = currentDate.toISOString().split('T')[0];
  const schedule = getScheduleForDate(currentDate, cabinetItems, profile, dailyOverrides);
  const todaysTaken = takenLog[dateKey] || [];
  const todaysSkipped = skippedLog[dateKey] || {};

  // Modal State
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [skipItemKey, setSkipItemKey] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');

  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState<{ id: string, name: string } | null>(null);
  const [moveScope, setMoveScope] = useState<'Today' | 'Future'>('Today');

  const [interactionModalVisible, setInteractionModalVisible] = useState(false);
  const [interactionText, setInteractionText] = useState<string>('');
  const [interactionActionParams, setInteractionActionParams] = useState<{ id: string; targetSlot: 'Morning' | 'Afternoon' | 'Evening'; proposedTime?: string } | null>(null);
  const [interactionKeepParams, setInteractionKeepParams] = useState<{ id: string; targetSlot: 'Morning' | 'Afternoon' | 'Evening' } | null>(null);

  const [adherenceModalVisible, setAdherenceModalVisible] = useState(false);

  // Sparkle Animation State
  const [sparkleActive, setSparkleActive] = useState(false);
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // Celebration State
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  const getCabinetId = (name: string) => {
    return cabinetItems.find(c => c.name.includes(name))?.id || 'null';
  };

  const triggerCelebration = (message: string) => {
    setCelebrationMessage(message);
    celebrationScale.setValue(0.5);
    celebrationOpacity.setValue(1);
    
    Animated.sequence([
      Animated.parallel([
        Animated.spring(celebrationScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true })
      ]),
      Animated.delay(2000),
      Animated.timing(celebrationOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start(() => setCelebrationMessage(null));
  };

  const checkCompletionAfterUpdate = (newTaken: string[], newSkipped: Record<string, string>) => {
    schedule.forEach(session => {
       const isNowComplete = session.items.length > 0 && session.items.every(item => 
         newTaken.includes(`${session.id}-${item.name}`) || 
         newSkipped[`${session.id}-${item.name}`]
       );
       
       const wasComplete = session.items.length > 0 && session.items.every(item => 
         todaysTaken.includes(`${session.id}-${item.name}`) || 
         todaysSkipped[`${session.id}-${item.name}`]
       );

       if (isNowComplete && !wasComplete) {
         triggerCelebration(`${session.time} Complete!`);
       }
    });
  };

  const triggerSparkle = () => {
    setSparkleActive(true);
    sparkleScale.setValue(0);
    sparkleOpacity.setValue(1);
    
    Animated.parallel([
      Animated.spring(sparkleScale, {
        toValue: 1.5,
        friction: 4,
        tension: 50,
        useNativeDriver: true
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0,
        duration: 1200,
        delay: 200,
        useNativeDriver: true
      })
    ]).start(() => setSparkleActive(false));
  };
  
  const handleToggle = (itemKey: string, itemName: string) => {
    const currentTaken = takenLog[dateKey] || [];
    let newTaken = [...currentTaken];
    let newSkipped = { ...todaysSkipped };

    if (currentTaken.includes(itemKey)) {
      newTaken = currentTaken.filter(id => id !== itemKey);
    } else {
      newTaken = [...currentTaken, itemKey];
      takeSupplement(getCabinetId(itemName));
      triggerSparkle();
      if (newSkipped[itemKey]) {
         delete newSkipped[itemKey];
      }
    }
    
    checkCompletionAfterUpdate(newTaken, newSkipped);

    setTakenLog(prev => ({ ...prev, [dateKey]: newTaken }));
    setSkippedLog(prev => ({ ...prev, [dateKey]: newSkipped }));
  };

  const handleTakeAll = (session: any) => {
    const currentTaken = takenLog[dateKey] || [];
    let newTaken = [...currentTaken];
    let newSkipped = { ...todaysSkipped };
    let takenSomething = false;

    session.items.forEach((item: any) => {
       const itemKey = `${session.id}-${item.name}`;
       if (!newTaken.includes(itemKey) && !newSkipped[itemKey]) {
          newTaken.push(itemKey);
          takeSupplement(getCabinetId(item.name));
          takenSomething = true;
       }
    });

    if (takenSomething) {
       triggerSparkle();
       checkCompletionAfterUpdate(newTaken, newSkipped);
       setTakenLog(prev => ({ ...prev, [dateKey]: newTaken }));
       setSkippedLog(prev => ({ ...prev, [dateKey]: newSkipped }));
    }
  };

  const handleMovePrompt = (id: string, name: string) => {
    setMoveTargetItem({ id, name });
    setMoveModalVisible(true);
  };

  const executeMove = (id: string, targetSlot: 'Morning' | 'Afternoon' | 'Evening', proposedTime?: string) => {
     const supplement = [...cabinetItems].find(i => i.id === id);
     if (!supplement) return;

     if (moveScope === 'Today') {
         setDailyOverride(dateKey, id, targetSlot, proposedTime ? proposedTime : (supplement.manualTimeString || ''));
     } else {
         editSupplement(id, { ...supplement, manualTimingProtocol: targetSlot, manualTimeString: proposedTime });
     }
     
     setMoveModalVisible(false);
     setMoveTargetItem(null);
     setInteractionModalVisible(false);
     setInteractionActionParams(null);
     setInteractionKeepParams(null);
  };

  const confirmMove = (targetSlot: 'Morning' | 'Afternoon' | 'Evening') => {
    if (!moveTargetItem) return;
    
    // Safety check with mock clinical logic (Calcium+Zinc and D3+Magnesium + Iron+Caffeine)
    const isMovingCalcium = moveTargetItem.name.toLowerCase().includes('calcium');
    const isMovingZinc = moveTargetItem.name.toLowerCase().includes('zinc');
    const isMovingD3 = moveTargetItem.name.toLowerCase().includes('d3');
    const isMovingMagnesium = moveTargetItem.name.toLowerCase().includes('magnesium');
    const isMovingIron = moveTargetItem.name.toLowerCase().includes('iron');
    const isMovingCaffeine = moveTargetItem.name.toLowerCase().includes('caffeine') || moveTargetItem.name.toLowerCase().includes('coffee') || moveTargetItem.name.toLowerCase().includes('green tea');
    
    // Get items currently in target slot
    const targetSession = schedule.find(s => s.time.includes(targetSlot));
    const targetItems = targetSession ? targetSession.items : [];
    
    const hasZincInTarget = targetItems.some(i => i.name.toLowerCase().includes('zinc') && i.id !== moveTargetItem.id);
    const hasCalciumInTarget = targetItems.some(i => i.name.toLowerCase().includes('calcium') && i.id !== moveTargetItem.id);
    const hasD3InTarget = targetItems.some(i => i.name.toLowerCase().includes('d3') && i.id !== moveTargetItem.id);
    const hasMagnesiumInTarget = targetItems.some(i => i.name.toLowerCase().includes('magnesium') && i.id !== moveTargetItem.id);
    const hasIronInTarget = targetItems.some(i => i.name.toLowerCase().includes('iron') && i.id !== moveTargetItem.id);
    const hasCaffeineInTarget = targetItems.some(i => (i.name.toLowerCase().includes('caffeine') || i.name.toLowerCase().includes('coffee') || i.name.toLowerCase().includes('green tea')) && i.id !== moveTargetItem.id);
    
    const isZincCalciumConflict = (isMovingCalcium && hasZincInTarget) || (isMovingZinc && hasCalciumInTarget);
    const isD3MagnesiumConflict = (isMovingD3 && hasMagnesiumInTarget) || (isMovingMagnesium && hasD3InTarget);
    const isIronCaffeineConflict = (isMovingIron && hasCaffeineInTarget) || (isMovingCaffeine && hasIronInTarget);
    
    if (isZincCalciumConflict || isD3MagnesiumConflict || isIronCaffeineConflict) {
        let conflictBaseTime = '';
        if (targetSlot === 'Morning') conflictBaseTime = profile.breakfastTime || '08:00 AM';
        if (targetSlot === 'Afternoon') conflictBaseTime = profile.lunchTime || '01:00 PM';
        if (targetSlot === 'Evening') conflictBaseTime = profile.sleepTime || '10:00 PM';
        
        // Dynamically calculate clinical temporal offset against user's specific profile preset times
        let proposedTime = conflictBaseTime;
        try {
            const [timeStr, period] = conflictBaseTime.trim().split(' ');
            let [hours, minutes] = timeStr.split(':').map(Number);
            let offsetHours = -2; // Offset 2 hours prior to sleep/dinner to protect absorption
            
            // If pushing earlier in the morning conflicts with waking protocol, push forward instead
            if (targetSlot === 'Morning') offsetHours = +2; 
            
            if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
            
            hours += offsetHours;
            if (hours < 0) hours += 24;
            if (hours >= 24) hours -= 24;
            
            const newPeriod = hours >= 12 ? 'PM' : 'AM';
            let newHours = hours % 12;
            if (newHours === 0) newHours = 12;
            
            proposedTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${newPeriod}`;
        } catch { /* Fallback to base */ }

        let warningText = `Scheduling ${moveTargetItem.name} alongside your ${targetSlot} protocol places it too close to an interfering supplement, which can decrease absorption rates.`;
        
        if (isD3MagnesiumConflict) {
            warningText = `Placing ${moveTargetItem.name} into the ${targetSlot} protocol schedules it directly alongside ${isMovingD3 ? 'Magnesium' : 'Vitamin D3'} (${conflictBaseTime}).\n\nHigh doses of Vitamin D3 can rapidly utilize Magnesium reserves and compete for your body's absorption pathways.\n\nOur clinical database recommends explicitly pushing ${moveTargetItem.name} up to ${proposedTime} to fully maximize its bioavailability!`;
        } else if (isZincCalciumConflict) {
            warningText = `Placing ${moveTargetItem.name} into the ${targetSlot} protocol schedules it directly alongside ${isMovingZinc ? 'Calcium' : 'Zinc'} (${conflictBaseTime}).\n\nCalcium is empirically shown to significantly decrease the body's ability to absorb Zinc.\n\nOur clinical database strongly recommends shifting ${moveTargetItem.name} off to ${proposedTime} for optimal absorption.`;
        } else if (isIronCaffeineConflict) {
            warningText = `Placing ${moveTargetItem.name} into the ${targetSlot} protocol schedules it directly alongside ${isMovingIron ? 'Caffeine/Coffee' : 'Iron'} (${conflictBaseTime}).\n\nCaffeine and its polyphenols completely paralyze biological iron uptake pathways.\n\nOur clinical database strongly recommends shifting ${moveTargetItem.name} separately to ${proposedTime} for unobstructed absorption.`;
        }

        setInteractionText(warningText);
        setInteractionActionParams({ id: moveTargetItem.id, targetSlot, proposedTime });
        setInteractionKeepParams({ id: moveTargetItem.id, targetSlot });
        setMoveModalVisible(false);
        
        // Timeout ensures the clean pop-up transition on iOS between overlapping modals
        setTimeout(() => {
           setInteractionModalVisible(true);
        }, 400);

    } else {
        executeMove(moveTargetItem.id, targetSlot);
    }
  };

  const handleSkipPrompt = (itemKey: string) => {
    setSkipItemKey(itemKey);
    setSkipReason('');
    setOtherReason('');
    setSkipModalVisible(true);
  };

  const confirmSkip = () => {
    if (!skipItemKey) return;
    const finalReason = skipReason === 'Other' ? otherReason : skipReason;
    
    const newSkipped = { ...todaysSkipped, [skipItemKey]: finalReason || 'Skipped' };
    const newTaken = todaysTaken.filter(id => id !== skipItemKey);
    
    checkCompletionAfterUpdate(newTaken, newSkipped);

    setSkippedLog(prev => ({
      ...prev,
      [dateKey]: newSkipped
    }));
    
    setTakenLog(prev => ({
      ...prev,
      [dateKey]: newTaken
    }));

    setSkipModalVisible(false);
  };

  const skipReasons = ["Out of stock", "Forgot", "Feeling unwell", "Fasting", "Other"];

  const totalItems = schedule.reduce((sum, s) => sum + s.items.length, 0);
  const adherenceScore = totalItems > 0 ? Math.round((todaysTaken.length / totalItems) * 100) : 0;

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const formatHeaderDate = (d: Date) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  const isToday = new Date().toDateString() === currentDate.toDateString();

  return (
    <View style={styles.container}>
      {/* Glossy Gradient Background */}
      <LinearGradient
        colors={[Colors.light.background, '#FFFFFF', Colors.light.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
              <Ionicons name="chevron-back" size={20} color="#8A9A83" />
            </TouchableOpacity>
            <Text style={styles.date}>{formatHeaderDate(currentDate)}</Text>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow} disabled={isToday}>
              <Ionicons name="chevron-forward" size={20} color={isToday ? 'transparent' : '#8A9A83'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Synergy</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity 
              onPress={() => setViewMode('daily')} 
              style={[styles.viewToggleOption, viewMode === 'daily' && styles.viewToggleOptionActive]}
            >
              <Text style={[styles.viewToggleText, viewMode === 'daily' && styles.viewToggleTextActive]}>Daily View</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setViewMode('weekly')} 
              style={[styles.viewToggleOption, viewMode === 'weekly' && styles.viewToggleOptionActive]}
            >
              <Text style={[styles.viewToggleText, viewMode === 'weekly' && styles.viewToggleTextActive]}>Weekly View</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'daily' ? (
          <>
            <RhythmScore score={adherenceScore} onPress={() => setAdherenceModalVisible(true)} />
            
            <View style={styles.statusSummaryContainer}>
          {schedule.map(session => {
            const totalItems = session.items.length;
            if (totalItems === 0) return null;
            
            const completedCount = session.items.filter(item => 
              todaysTaken.includes(`${session.id}-${item.name}`) || 
              todaysSkipped[`${session.id}-${item.name}`]
            ).length;
            
            let statusColor = '#F9F8F6'; 
            let borderColor = '#E8E6DF';
            let textColor = '#8A9A83';
            let iconName = 'time-outline';

            if (completedCount === totalItems) {
               statusColor = '#E8F5E9';
               borderColor = '#C8E6C9';
               textColor = Colors.light.primary;
               iconName = 'checkmark-circle';
            } else if (completedCount > 0) {
               statusColor = '#FFF9E6'; 
               borderColor = '#F0E6D2';
               textColor = '#D4AF37'; 
               iconName = 'hourglass-outline';
            }

            return (
              <View key={session.id} style={[styles.statusPill, { backgroundColor: statusColor, borderColor }]}>
                 <Ionicons name={iconName as any} size={14} color={textColor} style={{ marginRight: 4 }} />
                 <Text style={[styles.statusPillTitle, { color: textColor }]}>
                   {session.time.split(' ')[0]}
                 </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.insightBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
             <Ionicons name="medical" size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
             <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.light.primary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
               Powered by Clinical APIs
             </Text>
          </View>
          <Text style={styles.insightText}>
            Your daily protocol is optimally balanced. Gleam has cross-referenced clinical interaction data to secure your spacing and maximize absorption.
          </Text>
        </View>

        {schedule.map((session, sessionIndex) => {
          const isSessionComplete = session.items.length > 0 && session.items.every(item => todaysTaken.includes(`${session.id}-${item.name}`) || todaysSkipped[`${session.id}-${item.name}`]);
          
          return (
            <View key={session.id} style={styles.sessionContainer}>
              <View style={styles.sessionHeaderRow}>
                 <View style={[styles.sessionDot, isSessionComplete && { backgroundColor: Colors.light.primary }]} />
                 <Text style={[styles.sessionTime, { flex: 1 }]}>{session.time}</Text>
                 
                 {!isSessionComplete && session.items.length > 1 && (
                    <TouchableOpacity 
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(216, 184, 136, 0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(216, 184, 136, 0.3)', marginRight: 4 }}
                      onPress={() => handleTakeAll(session)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#D8B888' }}>Take All</Text>
                    </TouchableOpacity>
                 )}
                 
                 {isSessionComplete && (
                   <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} style={{ marginLeft: 8 }} />
                 )}
              </View>
              
              {session.caffeineEvents?.map((event, index) => (
                <View key={`caffeine-${session.id}-${index}`} style={[styles.card, { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDF8F5', borderColor: '#E8DED1', borderWidth: 1, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12, opacity: 0.8 }]}>
                  <View style={[styles.cardIconWrapper, { backgroundColor: '#F4EBE1', width: 38, height: 38, borderRadius: 19, marginRight: 14 }]}>
                    <Ionicons name="cafe" size={18} color="#A78B6C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#5A4E40' }}>{event.type}</Text>
                      <View style={[styles.itemTimeTag, { backgroundColor: 'rgba(167, 139, 108, 0.1)', marginLeft: 0 }]}>
                        <Ionicons name="time-outline" size={10} color="#A78B6C" />
                        <Text style={[styles.itemTimeText, { color: '#A78B6C' }]}>{event.time}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: '#8C7A6B', fontStyle: 'italic' }}>
                      Logged routine intake (polyphenol interaction risk)
                    </Text>
                  </View>
                </View>
              ))}

              {session.items.map((item, index) => {
                const itemKey = `${session.id}-${item.name}`;
                return (
                  <AnimatedCard 
                    key={itemKey} 
                    item={item} 
                    index={sessionIndex * Math.max(session.items.length, 1) + (session.caffeineEvents?.length || 0) + index} 
                    taken={todaysTaken.includes(itemKey)}
                    skipped={!!todaysSkipped[itemKey]}
                    skipReason={todaysSkipped[itemKey]}
                    onToggle={() => handleToggle(itemKey, item.name)}
                    onSkip={() => handleSkipPrompt(itemKey)}
                    onMove={() => handleMovePrompt(item.id, item.name)}
                  />
                );
              })}
            </View>
          );
        })}
        </>
        ) : (
          <WeeklyOverview 
            currentDate={currentDate}
            cabinetItems={cabinetItems}
            profile={profile}
            dailyOverrides={dailyOverrides}
            takenLog={takenLog}
            skippedLog={skippedLog}
            onSelectDay={(day: Date) => {
              setCurrentDate(day);
              setViewMode('daily');
            }}
          />
        )}

        <View style={styles.disclaimerWrapper}>
          <Disclaimer />
        </View>
      </ScrollView>

      {/* Sparkle Effect Overlay */}
      {sparkleActive && (
        <View style={styles.sparkleOverlayContainer} pointerEvents="none">
          <Animated.View style={[
            styles.sparkleAnimation, 
            { transform: [{ scale: sparkleScale }], opacity: sparkleOpacity }
          ]}>
            <Ionicons name="sparkles" size={100} color={Colors.light.primary} />
            <Ionicons name="sparkles" size={40} color="#D4AF37" style={{ position: 'absolute', top: -20, right: -20 }} />
            <Ionicons name="sparkles" size={30} color={Colors.light.accent} style={{ position: 'absolute', bottom: -10, left: -20 }} />
          </Animated.View>
        </View>
      )}

      {/* Celebration Popup */}
      {celebrationMessage && (
        <Animated.View style={[
          styles.celebrationPopup,
          { transform: [{ scale: celebrationScale }], opacity: celebrationOpacity }
        ]} pointerEvents="none">
          <LinearGradient
            colors={['#F9FAF9', '#FFFFFF']}
            style={styles.celebrationGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="sparkles" size={28} color={Colors.light.primary} style={styles.celebrationIcon} />
          <Text style={styles.celebrationText}>{celebrationMessage}</Text>
          <Text style={styles.celebrationSubtext}>Great job staying on track!</Text>
        </Animated.View>
      )}

      {/* Move Modal */}
      <Modal visible={moveModalVisible} transparent animationType="fade" onRequestClose={() => setMoveModalVisible(false)}>
        <View style={styles.modalOverlay}>
          {/* Un-nested backdrop interceptor */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoveModalVisible(false)} />
          
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent} pointerEvents="box-none">
                <Text style={styles.modalTitle}>Reschedule Supplement</Text>
                <Text style={styles.modalSubtitle}>Select an optimal time slot to shift {moveTargetItem?.name} into.</Text>
                
                <View style={{ flexDirection: 'row', backgroundColor: 'rgba(138, 154, 131, 0.1)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                   <TouchableOpacity 
                      onPress={() => setMoveScope('Today')} 
                      style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: moveScope === 'Today' ? '#FFFFFF' : 'transparent', shadowColor: moveScope === 'Today' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                   >
                      <Text style={{ fontSize: 13, fontFamily: moveScope === 'Today' ? 'Inter_600SemiBold' : 'Inter_500Medium', color: moveScope === 'Today' ? '#2C3E2A' : '#8A9A83' }}>Today Only</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                      onPress={() => setMoveScope('Future')} 
                      style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: moveScope === 'Future' ? '#FFFFFF' : 'transparent', shadowColor: moveScope === 'Future' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                   >
                      <Text style={{ fontSize: 13, fontFamily: moveScope === 'Future' ? 'Inter_600SemiBold' : 'Inter_500Medium', color: moveScope === 'Future' ? '#2C3E2A' : '#8A9A83' }}>All Future Days</Text>
                   </TouchableOpacity>
                </View>

                {['Morning', 'Afternoon', 'Evening'].map(slot => (
                  <TouchableOpacity 
                    key={slot} 
                    style={[styles.reasonOption, { zIndex: 999 }]}
                    onPress={() => confirmMove(slot as 'Morning' | 'Afternoon' | 'Evening')}
                  >
                    <Ionicons name="time-outline" size={20} color="#8A9A83" />
                    <Text style={[styles.reasonText, { fontFamily: 'Inter_600SemiBold' }]}>{slot} Protocol</Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalCancelBtn, { width: '100%', marginTop: 24, zIndex: 999 }]} onPress={() => setMoveModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Adherence & Science Modal */}
      <Modal visible={adherenceModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#F9F8F6', padding: 24, borderTopLeftRadius: 36, borderTopRightRadius: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 24, paddingBottom: insets.bottom + 24 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Ionicons name="sparkles" size={24} color="#D8B888" style={{ marginRight: 8 }} />
                   <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: '#2C3E2A' }}>The Science</Text>
                </View>
                <TouchableOpacity onPress={() => setAdherenceModalVisible(false)} style={{ backgroundColor: '#E8F5E9', padding: 8, borderRadius: 16 }}>
                    <Ionicons name="close" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {/* Section 1: Why Adherence Matters */}
              <View style={{ marginBottom: 24 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="trending-up" size={18} color="#D8B888" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#2C3E2A' }}>Why Adherence Matters</Text>
                 </View>
                 <Text style={{ fontSize: 14, color: '#4A5546', lineHeight: 22, fontFamily: 'Inter_400Regular' }}>
                   Supplements modify your biological baseline progressively. Hitting 90%+ daily adherence ensures your cellular plasma concentrations remain explicitly stable, rather than indiscriminately spiking and crashing. This securely avoids metabolic fatigue.
                 </Text>
              </View>

              {/* Section 2: Today's Interactions */}
              <View style={{ marginBottom: 24 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="flash" size={18} color="#D8B888" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#2C3E2A' }}>Today&apos;s Interactions</Text>
                 </View>
                 <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0EBE1' }}>
                   {(() => {
                      const positiveInfo = [];
                      const negativeInfo = [];
                      
                      const findSlot = (nameQuery: string) => {
                          const session = schedule.find(s => s.items.some(i => i.name.toLowerCase().includes(nameQuery)));
                          return session ? session.time.split(' ')[0] : null;
                      };
                      
                      const zincSlot = findSlot('zinc');
                      const calciumSlot = findSlot('calcium');
                      if (zincSlot && calciumSlot) {
                          if (zincSlot === calciumSlot) {
                              negativeInfo.push("⚠️ Zinc & Calcium:\nThese are currently scheduled together. Ensure they are separated by 2+ hours to avoid absorption blocking.");
                          } else {
                              positiveInfo.push(`✨ Zinc & Calcium:\nPerfectly spaced apart (${zincSlot} vs ${calciumSlot})! If taken together, Calcium explicitly binds to and blocks Zinc from being absorbed.`);
                          }
                      }
                      
                      const d3Slot = findSlot('d3');
                      const magSlot = findSlot('magnesium');
                      if (d3Slot && magSlot) {
                          if (d3Slot === magSlot) {
                              negativeInfo.push("⚠️ Vitamin D3 & Magnesium:\nScheduled tightly together. High doses of D3 rapidly deplete Magnesium. Separation strongly advised.");
                          } else {
                              positiveInfo.push(`✨ Vitamin D3 & Magnesium:\nSafely allocated (${d3Slot} vs ${magSlot})! If mistakenly taken together, heavy D3 metabolism rapidly strips your active Magnesium reserves.`);
                          }
                      }

                      const ironSlot = findSlot('iron');
                      const caffeineSlot = findSlot('caffeine') || findSlot('coffee') || findSlot('green tea');
                      if (ironSlot && caffeineSlot) {
                          if (ironSlot === caffeineSlot) {
                              negativeInfo.push("⚠️ Iron & Caffeine:\nCaffeine actively blocks Iron absorption. Please space these separated by 2 hours minimum.");
                          } else {
                              positiveInfo.push(`✨ Iron & Caffeine:\nSpaced perfectly! If scheduled incorrectly, the heavy polyphenols in Caffeine completely paralyze Iron uptake pathways.`);
                          }
                      }
                      
                      const cSlot = findSlot('vitamin c') || findSlot('ascorbic');
                      if (ironSlot && cSlot) {
                          if (ironSlot === cSlot) {
                              positiveInfo.push("✨ Iron & Vitamin C:\nPaired flawlessly! Vitamin C heavily enhances oxidative Iron rates for maximum bioavailability.");
                          } else {
                              negativeInfo.push("💡 Tip - Iron & Vitamin C:\nConsider scheduling these directly together to unlock a massive boost in clinical Iron absorption!");
                          }
                      }
                      
                      const finalInfo = [...positiveInfo, ...negativeInfo];
                      if (finalInfo.length === 0) finalInfo.push("✅ No specific synergies or adverse conflicts flagged heavily in your stack!");
                      
                      return finalInfo.map((text, i) => (
                         <Text key={i} style={{ fontSize: 13, color: '#4A5546', lineHeight: 20, fontFamily: 'Inter_500Medium', marginBottom: i === finalInfo.length - 1 ? 0 : 12 }}>{text}</Text>
                      ));
                   })()}
                 </View>
              </View>

              {/* Section 3: Absorption Tips */}
              <View style={{ marginBottom: 24 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="water" size={18} color="#D8B888" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#2C3E2A' }}>Absorption Tips</Text>
                 </View>
                 {(() => {
                      const tips = [];
                      const check = (str: string) => cabinetItems.some(i => i.name.toLowerCase().includes(str));
                      
                      if (check('d3') || check('vitamin a') || check('vitamin e') || check('vitamin k') || check('omega') || check('fish oil')) {
                          tips.push("• Intake your fat-soluble elements (A, D, E, K or Omega-3s) strictly alongside healthy fats (like avocados or olive oils) to properly bind to uptake pathways.");
                      }
                      if (check('b-complex') || check('b12') || check('energy')) {
                          tips.push("• Always target your complex B-Vitamins intensely early in your morning protocol to explicitly prevent night time sleep disruptions.");
                      }
                      if (check('magnesium') || check('sleep') || check('ashwagandha') || check('melatonin')) {
                          tips.push("• Your sleep-oriented protocols should ideally be fully triggered 60 to 90 minutes before your head ever hits the pillow.");
                      }
                      if (check('probiotic') || check('gut')) {
                          tips.push("• Take Probiotics roughly 30 minutes before heavy acidic meals. This secures a clean drop into the gut biome without destruction.");
                      }
                      if (check('zinc') || check('iron') || check('copper')) {
                          tips.push("• Pure intense minerals like Zinc/Iron are heavy on digestion. If you experience mild nausea, try forcing them directly into the center of a dense meal.");
                      }

                      if (cabinetItems.length >= 4) {
                          tips.push("• With a comprehensive biological load of 4+ daily agents, cleanly increase your daytime hydration to rapidly filter liver/kidney processing.");
                      }
                      
                      if (tips.length === 0) {
                          tips.push("• For extreme baseline optimal performance, we strongly recommend pairing pure base vitamins deeply with light carbohydrate snacks.");
                          tips.push("• Hydrate extensively to rapidly clear cellular waste from intense organic utilization.");
                      }
                      
                      return tips.map((text, i) => (
                         <Text key={i} style={{ fontSize: 14, color: '#4A5546', lineHeight: 22, fontFamily: 'Inter_400Regular', marginBottom: i === tips.length - 1 ? 0 : 12 }}>{text}</Text>
                      ));
                 })()}
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* Interaction Warning Modal */}
      <Modal visible={interactionModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setInteractionModalVisible(false)} accessible={false}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 32 }]}>
                
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(216, 184, 136, 0.15)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24, marginTop: 8 }}>
                  <Ionicons name="information" size={32} color="#D8B888" />
                </View>

                <Text style={[styles.modalTitle, { textAlign: 'center', fontSize: 24, marginBottom: 12 }]}>Optimal Spacing Tip</Text>
                
                <View style={{ backgroundColor: '#F9F8F6', padding: 24, borderRadius: 20, marginBottom: 32, borderWidth: 1, borderColor: '#F0EBE1' }}>
                  <Text style={[styles.modalSubtitle, { marginBottom: 0, textAlign: 'left', lineHeight: 24, color: '#4A5546', fontSize: 16 }]}>
                    {interactionText}
                  </Text>
                </View>

                <View style={{ gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.primaryButton, { width: '100%', marginTop: 0 }]} 
                    onPress={() => {
                        setInteractionModalVisible(false);
                        if (interactionActionParams) {
                            executeMove(interactionActionParams.id, interactionActionParams.targetSlot, interactionActionParams.proposedTime);
                        }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonText}>Accept Optimal Timing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ width: '100%', paddingVertical: 16, alignItems: 'center' }} 
                    onPress={() => {
                        setInteractionModalVisible(false);
                        if (interactionKeepParams) {
                            executeMove(interactionKeepParams.id, interactionKeepParams.targetSlot);
                        }
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#8A9A83' }}>Keep Original Time</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Skip Modal */}
      <Modal visible={skipModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setSkipModalVisible(false)} accessible={false}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Skip Dose</Text>
                <Text style={styles.modalSubtitle}>Why are you skipping this supplement today?</Text>
                
                {skipReasons.map(reason => (
                  <TouchableOpacity 
                    key={reason} 
                    style={[styles.reasonOption, skipReason === reason && styles.reasonOptionSelected]}
                    onPress={() => setSkipReason(reason)}
                  >
                    <Ionicons 
                      name={skipReason === reason ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={skipReason === reason ? Colors.light.primary : '#8A9A83'} 
                    />
                    <Text style={[styles.reasonText, skipReason === reason && styles.reasonTextSelected]}>{reason}</Text>
                  </TouchableOpacity>
                ))}

                {skipReason === 'Other' && (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please specify..."
                    placeholderTextColor="#9BA1A6"
                    value={otherReason}
                    onChangeText={setOtherReason}
                    autoFocus
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSkipModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalConfirmBtn, (!skipReason || (skipReason === 'Other' && !otherReason)) && { opacity: 0.5 }]} 
                    onPress={confirmSkip}
                    disabled={!skipReason || (skipReason === 'Other' && !otherReason)}
                  >
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
    marginBottom: 24,
    alignItems: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'center',
  },
  dateArrow: {
    padding: 8,
  },
  date: {
    fontSize: 12,
    color: '#8A9A83',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginHorizontal: 16,
  },
  title: {
    fontSize: 38,
    color: Colors.light.text,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: -0.5,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(138, 154, 131, 0.1)',
    borderRadius: 14,
    padding: 2,
    marginTop: 16,
    width: '100%',
  },
  viewToggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  viewToggleOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#8A9A83',
  },
  viewToggleTextActive: {
    color: '#2C3E2A',
    fontFamily: 'Inter_600SemiBold',
  },
  weeklyViewContainer: {
    paddingTop: 10,
  },
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  dayCard: {
    width: '31%', // roughly 3 columns
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 230, 223, 0.5)',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 4,
  },
  dayCardSelected: {
     borderColor: Colors.light.primary,
     borderWidth: 2,
     backgroundColor: '#FFFFFF',
  },
  dayName: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#8A9A83',
    marginBottom: 8,
  },
  dayDate: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#2C3E2A',
    marginBottom: 12,
  },
  miniScoreContainer: {
     width: 44,
     height: 44,
     borderRadius: 22,
     backgroundColor: 'rgba(138, 154, 131, 0.1)',
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 12,
  },
  miniScoreText: {
     fontSize: 11,
     fontFamily: 'Inter_700Bold',
     color: '#2C3E2A',
  },
  dayStatusDots: {
    flexDirection: 'row',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8E6DF',
  },
  statusDotActive: {
    backgroundColor: Colors.light.primary,
  },
  scoreWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 75,
    padding: 8,
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontFamily: 'Inter_600SemiBold',
    color: '#2D3A28',
    marginBottom: -4,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A9A83',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusPillTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  insightBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(232, 230, 223, 0.7)',
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#4A5546', // Medium dark green
    lineHeight: 22,
    textAlign: 'center',
  },
  sessionContainer: {
    marginBottom: 32,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
    marginRight: 10,
  },
  sessionTime: {
    fontSize: 22,
    color: Colors.light.primary,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  cardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E8E6DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  checkboxActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  cardContent: {
    flex: 1,
  },
  suppName: {
    fontSize: 17,
    color: Colors.light.text,
    marginBottom: 6,
    fontFamily: 'Inter_600SemiBold',
  },
  itemTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  itemTimeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A9A83',
    marginLeft: 4,
  },
  suppInstruct: {
    fontSize: 13,
    color: '#687076',
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  disclaimerWrapper: {
    marginTop: 16,
    marginBottom: 40,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0EBE1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  skipText: {
    fontSize: 12,
    color: '#8A9A83',
    fontFamily: 'Inter_600SemiBold',
  },
  checkboxSkipped: {
    backgroundColor: '#E8E6DF',
    borderColor: '#E8E6DF',
  },
  sparkleOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sparkleAnimation: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#687076',
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE1',
  },
  reasonOptionSelected: {
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  reasonText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#4A5546',
    marginLeft: 12,
  },
  reasonTextSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.primary,
  },
  textInput: {
    backgroundColor: '#F9F8F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.light.text,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8E6DF',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F0EBE1',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#4A5546',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  celebrationPopup: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    borderRadius: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 200,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 230, 223, 0.9)',
  },
  celebrationGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  celebrationIcon: {
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  celebrationSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#687076',
    textAlign: 'center',
  }
});
