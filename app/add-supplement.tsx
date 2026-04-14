import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCabinet, Ingredient } from '@/context/CabinetContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

const UNITS = ['mg', 'mcg', 'g', 'IU', 'ml', '%'];

const COMMON_SUPPLEMENTS = [
  'Ashwagandha', 'B-Complex', 'Biotin', 'Calcium', 'Collagen Peptides', 'CoQ10', 
  'Creatine', 'Fish Oil (Omega-3)', 'Iron', 'L-Theanine', 'Maca Root', 
  'Magnesium Citrate', 'Magnesium Glycinate', 'Magnesium Threonate', 'Melatonin', 
  'Probiotics', 'Turmeric Curcumin', 'Vitamin A', 'Vitamin B12', 'Vitamin C', 
  'Vitamin D3', 'Vitamin K2', 'Whey Protein', 'Zinc'
];

const SectionCard = ({ title, icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={Colors.light.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

export default function AddSupplementModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addSupplement, editSupplement, cabinetItems } = useCabinet();
  
  const existingItem = id ? cabinetItems.find(i => i.id === id) : null;
  const isEditing = !!existingItem;

  const [mode, setMode] = useState<'options' | 'camera' | 'analyzing' | 'manual'>(isEditing ? 'manual' : 'options');
  const [isSaving, setIsSaving] = useState(false);

  
  // Form State
  const [name, setName] = useState(existingItem?.name || '');
  const [category, setCategory] = useState(existingItem?.category || '');
  const [quantity, setQuantity] = useState(existingItem?.originalBoxQuantity?.toString() || '');
  const [remainingQuantity, setRemainingQuantity] = useState(existingItem?.currentStock?.toString() || '');
  const [reminderThreshold, setReminderThreshold] = useState(existingItem?.lowStockAlertQuantity?.toString() || '14');
  const [dose, setDose] = useState(existingItem?.amountPerDose || '');
  const [frequency, setFrequency] = useState(existingItem?.frequency || 'Daily');
  const [frequencyPerPeriod, setFrequencyPerPeriod] = useState(existingItem?.frequencyPerPeriod || 1);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    existingItem?.ingredients && existingItem.ingredients.length > 0
      ? existingItem.ingredients
      : [{ name: '', amount: '', unit: 'mg' }]
  );
  const [instructions, setInstructions] = useState(existingItem?.additionalNotes || '');
  const [reason, setReason] = useState(existingItem?.reasonForTaking || '');
  const [symptomList, setSymptomList] = useState<string[]>(
    existingItem?.symptoms ? existingItem.symptoms.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  );
  const [symptomInput, setSymptomInput] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState(existingItem?.reviewPeriodFrequency || 'Monthly');
  
  // New Timing/End Condition State
  const [startDate, setStartDate] = useState(existingItem?.startDate || new Date().toISOString().split('T')[0]);
  const [endCondition, setEndCondition] = useState<'Never' | 'Date' | 'Occurrences'>(existingItem?.endCondition || 'Never');
  const [endDate, setEndDate] = useState(existingItem?.endDate || '');
  const [endOccurrences, setEndOccurrences] = useState(existingItem?.endOccurrences || '');

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIngredientIndex, setActiveIngredientIndex] = useState<number | null>(null);
  
  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  // Ingredient Logic
  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients];
    if (field === 'amount') {
      newIngredients[index] = { ...newIngredients[index], [field]: value.replace(/[^0-9]/g, '') };
    } else {
      newIngredients[index] = { ...newIngredients[index], [field]: value };
    }
    setIngredients(newIngredients);
  };

  const cycleUnit = (index: number) => {
    const currentUnit = ingredients[index].unit || 'mg';
    const nextIdx = (UNITS.indexOf(currentUnit) + 1) % UNITS.length;
    updateIngredient(index, 'unit', UNITS[nextIdx]);
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: 'mg' }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addSymptom = () => {
    if (symptomInput.trim().length > 0) {
      setSymptomList([...symptomList, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const removeSymptom = (index: number) => {
    setSymptomList(symptomList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !quantity) return;
    setIsSaving(true);
    
    const supplementData = {
      name,
      category: category || 'Other',
      originalBoxQuantity: parseInt(quantity, 10),
      currentStock: remainingQuantity ? parseInt(remainingQuantity, 10) : parseInt(quantity, 10),
      lowStockAlertQuantity: parseInt(reminderThreshold, 10) || 14,
      amountPerDose: dose,
      frequency,
      frequencyPerPeriod: frequencyPerPeriod,
      ingredients: ingredients.filter(i => i.name.trim() !== ''),
      additionalNotes: instructions,
      reasonForTaking: reason,
      reviewPeriodFrequency: reviewPeriod,
      startDate,
      symptoms: symptomList.join(', '),
      endCondition,
      endDate: endCondition === 'Date' ? endDate : undefined,
      endOccurrences: endCondition === 'Occurrences' ? endOccurrences : undefined
    };

    try {
      if (isEditing && id) {
        await editSupplement(id, supplementData);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/explore');
        }
      } else {
        await addSupplement(supplementData);
        if (Platform.OS === 'web') {
           window.alert("Protocol Optimised:\n\nGleam safely cross-referenced clinical endpoints. Your new daily rhythm is securely spaced.");
           router.replace('/');
        } else {
           Alert.alert("Protocol Optimised", "Gleam safely cross-referenced clinical endpoints. Your new daily rhythm is securely spaced.", [{
             text: "View Rhythm", onPress: () => router.replace('/')
           }]);
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Could not save supplement. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const startCamera = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setMode('camera');
    setCapturedImages([]);
  };

  const takePicture = async () => {
    if (cameraRef.current && capturedImages.length < 4) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true
        });
        setCapturedImages(prev => [...prev, photo.uri]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const analyzePhotos = () => {
    setMode('analyzing');
    
    // Simulate AI extraction delay from photos
    setTimeout(() => {
      setMode('manual');
      setName('Sleep & Restore Complex');
      setCategory('Other');
      setQuantity('60');
      setReminderThreshold('14');
      setDose('2');
      setFrequency('Daily');
      setFrequencyPerPeriod(1);
      setIngredients([
        { name: 'Magnesium Glycinate', amount: '200', unit: 'mg' },
        { name: 'L-Theanine', amount: '100', unit: 'mg' },
        { name: 'Apigenin', amount: '50', unit: 'mg' }
      ]);
      setInstructions('Take 30-60 minutes before bed with water.');
      setReason('Better sleep quality');
      setSymptomList(['Taking too long to fall asleep', 'restless mind']);
      setReviewPeriod('Bi-Weekly');
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Glossy Gradient Background */}
      <LinearGradient
        colors={[Colors.light.background, '#FFFFFF', Colors.light.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                 router.back();
              } else {
                 router.replace('/(tabs)/explore');
              }
            }} 
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Supplement' : 'Add to Cabinet'}</Text>
          <View style={{ width: 28 }} />
        </View>

        {mode === 'options' && (
          <View style={styles.optionsContainer}>
            <Text style={styles.promptText}>How would you like to add an item?</Text>
            
            <TouchableOpacity style={styles.optionCard} onPress={startCamera} activeOpacity={0.8}>
              <View style={styles.optionIconWrapper}>
                <Ionicons name="camera-outline" size={28} color={Colors.light.primary} />
              </View>
              <View style={styles.optionTextWrapper}>
                <Text style={styles.optionTitle}>Capture Labels</Text>
                <Text style={styles.optionSubtitle}>Snap photos to extract info automatically</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C1C8BD" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={() => setMode('manual')} activeOpacity={0.8}>
              <View style={styles.optionIconWrapper}>
                <Ionicons name="create-outline" size={28} color={Colors.light.primary} />
              </View>
              <View style={styles.optionTextWrapper}>
                <Text style={styles.optionTitle}>Enter Manually</Text>
                <Text style={styles.optionSubtitle}>Type exactly what you have</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#C1C8BD" />
            </TouchableOpacity>
          </View>
        )}

        {mode === 'camera' && (
          <View style={styles.scannerContainer}>
            {permission?.granted ? (
               <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
               >
                 <View style={styles.cameraOverlay}>
                    {/* Top Toolbar */}
                    <View style={styles.cameraTopBar}>
                      <TouchableOpacity onPress={() => setMode('options')} style={styles.cameraCloseButton}>
                         <Text style={styles.cameraCloseText}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.cameraInstruction}>Position label in frame</Text>
                    </View>

                    {/* Image Strip / Capture UI */}
                    <View style={styles.cameraBottomBar}>
                       <ScrollView 
                          horizontal 
                          style={styles.imageStrip} 
                          showsHorizontalScrollIndicator={false}
                       >
                         {capturedImages.map((uri, idx) => (
                           <View key={idx} style={styles.previewContainer}>
                             <Image source={{ uri }} style={styles.previewImage} />
                             <TouchableOpacity style={styles.removeImageIcon} onPress={() => removeImage(idx)}>
                               <Ionicons name="close-circle" size={20} color="white" />
                             </TouchableOpacity>
                           </View>
                         ))}
                       </ScrollView>

                       <View style={styles.cameraControls}>
                         <Text style={styles.photoCountText}>{capturedImages.length}/4 Photos</Text>
                         
                         <TouchableOpacity 
                            style={[
                              styles.captureButton, 
                              capturedImages.length >= 4 && { opacity: 0.5 }
                            ]} 
                            onPress={takePicture}
                            disabled={capturedImages.length >= 4}
                          >
                           <View style={styles.captureInner} />
                         </TouchableOpacity>

                         {capturedImages.length > 0 ? (
                            <TouchableOpacity style={styles.analyzeButton} onPress={analyzePhotos}>
                              <Ionicons name="sparkles" size={16} color="white" />
                              <Text style={styles.analyzeButtonText}>Extract</Text>
                            </TouchableOpacity>
                         ) : (
                            <View style={{ width: 100 }} />
                         )}
                       </View>
                    </View>
                 </View>
               </CameraView>
            ) : (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>We need camera permissions to read your supplement labels.</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                   <Text style={styles.permissionBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {mode === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.analyzingTitle}>Extracting Supplement Data</Text>
            <Text style={styles.analyzingSubtitle}>Reading ingredients, doses, and instructions...</Text>
          </View>
        )}

        {mode === 'manual' && (
          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <SectionCard title="Core Details" icon="medical-outline">
                <View style={{ zIndex: 10, marginBottom: 20 }}>
                  <Text style={styles.inputLabel}>Supplement Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Magnesium..."
                    placeholderTextColor="#9BA1A6"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setShowSuggestions(text.length > 0);
                    }}
                    onFocus={() => {
                      if (name.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  
                  {showSuggestions && name.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.suggestionsList}>
                        {COMMON_SUPPLEMENTS.filter(s => s.toLowerCase().includes(name.toLowerCase()) && s.toLowerCase() !== name.toLowerCase()).map((suggestion) => (
                          <TouchableOpacity 
                            key={suggestion} 
                            style={styles.suggestionItem} 
                            onPress={() => {
                              setName(suggestion);
                              setShowSuggestions(false);
                            }}
                          >
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.inputLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContainer}>
                    {['Vitamins', 'Minerals', 'Botanicals / Herbs', 'Amino Acids', 'Lipids', 'Probiotics', 'Enzymes', 'Other'].map((opt) => (
                       <TouchableOpacity 
                         key={opt}
                         style={[styles.chip, category === opt && styles.chipActive]}
                         onPress={() => setCategory(opt)}
                         activeOpacity={0.8}
                       >
                         <Text style={[styles.chipText, category === opt && styles.chipTextActive]}>{opt}</Text>
                       </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
            </SectionCard>

            <SectionCard title="Scheduling & Protocols" icon="calendar-outline">
                <View style={{ marginBottom: 20 }}>
                    <Text style={styles.inputLabel}>Start Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#9BA1A6"
                        value={startDate}
                        onChangeText={setStartDate}
                    />
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Text style={styles.inputLabel}>End Condition</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContainer}>
                        {['Never', 'Date', 'Occurrences'].map((cond) => (
                            <TouchableOpacity
                                key={cond}
                                style={[styles.chip, endCondition === cond && styles.chipActive]}
                                onPress={() => setEndCondition(cond as any)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, endCondition === cond && styles.chipTextActive]}>
                                    {cond === 'Never' ? 'Indefinitely' : cond === 'Date' ? 'On a Date' : 'After Occurrences'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {endCondition === 'Date' && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.inputLabel}>End Date</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9BA1A6"
                            value={endDate}
                            onChangeText={setEndDate}
                        />
                    </View>
                )}

                {endCondition === 'Occurrences' && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.inputLabel}>Stop After (Occurrences)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 30"
                            placeholderTextColor="#9BA1A6"
                            keyboardType="number-pad"
                            value={endOccurrences}
                            onChangeText={(val) => setEndOccurrences(val.replace(/[^0-9]/g, ''))}
                        />
                    </View>
                )}

                <View style={{ marginBottom: 20 }}>
                  <View style={styles.frequencyHeaderRow}>
                    <Text style={styles.inputLabel}>Frequency</Text>
                    {frequency !== 'As Needed' && (
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity onPress={() => setFrequencyPerPeriod(Math.max(1, frequencyPerPeriod - 1))} style={styles.stepperButton}>
                          <Ionicons name="remove" size={16} color={Colors.light.primary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValue}>{frequencyPerPeriod}x</Text>
                        <TouchableOpacity onPress={() => setFrequencyPerPeriod(frequencyPerPeriod + 1)} style={styles.stepperButton}>
                          <Ionicons name="add" size={16} color={Colors.light.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContainer}>
                    {['Daily', 'Weekly', 'As Needed'].map((opt) => (
                       <TouchableOpacity 
                         key={opt}
                         style={[styles.chip, frequency === opt && styles.chipActive]}
                         onPress={() => setFrequency(opt)}
                         activeOpacity={0.8}
                       >
                         <Text style={[styles.chipText, frequency === opt && styles.chipTextActive]}>{opt}</Text>
                       </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
            </SectionCard>

            <SectionCard title="Formula & Ingredients" icon="flask-outline">
                <View style={styles.ingredientsHeaderRow}>
                  <Text style={styles.inputLabel}>Active Ingredients</Text>
                </View>
                {ingredients.map((ing, idx) => (
                  <View key={idx} style={[styles.ingredientRow, { zIndex: 50 - idx }]}>
                    <View style={styles.ingredientInputWrapper}>
                      <TextInput
                        style={[styles.input, styles.ingredientInput]}
                        placeholder="e.g. Iron"
                        placeholderTextColor="#9BA1A6"
                        value={ing.name}
                        onChangeText={(val) => {
                          updateIngredient(idx, 'name', val);
                          setActiveIngredientIndex(val.length > 0 ? idx : null);
                        }}
                        onFocus={() => {
                          if (ing.name.length > 0) setActiveIngredientIndex(idx);
                        }}
                        onBlur={() => setTimeout(() => {
                          if (activeIngredientIndex === idx) setActiveIngredientIndex(null);
                        }, 200)}
                      />
                      
                      {activeIngredientIndex === idx && ing.name.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.suggestionsList}>
                            {COMMON_SUPPLEMENTS.filter(s => s.toLowerCase().includes(ing.name.toLowerCase()) && s.toLowerCase() !== ing.name.toLowerCase()).map((suggestion) => (
                              <TouchableOpacity 
                                key={suggestion} 
                                style={styles.suggestionItem} 
                                onPress={() => {
                                  updateIngredient(idx, 'name', suggestion);
                                  setActiveIngredientIndex(null);
                                }}
                              >
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={[styles.input, styles.ingredientAmount]}
                      placeholder="50"
                      placeholderTextColor="#9BA1A6"
                      keyboardType="numeric"
                      value={ing.amount}
                      onChangeText={(val) => updateIngredient(idx, 'amount', val)}
                    />
                    <TouchableOpacity style={styles.unitPill} onPress={() => cycleUnit(idx)} activeOpacity={0.8}>
                      <Text style={styles.unitPillText}>{ing.unit || 'mg'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeIngredientRow(idx)} style={styles.removeIngredientBtn} disabled={ingredients.length === 1}>
                      <Ionicons name="trash-outline" size={20} color={ingredients.length === 1 ? '#E8E6DF' : '#FF6B6B'} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredientRow} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} />
                  <Text style={styles.addIngredientText}>Add Another Ingredient</Text>
                </TouchableOpacity>

                <View style={{ marginTop: 24 }}>
                  <Text style={styles.inputLabel}>Amount per Dose</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2"
                    placeholderTextColor="#9BA1A6"
                    keyboardType="number-pad"
                    value={dose}
                    onChangeText={(val) => setDose(val.replace(/[^0-9]/g, ''))}
                  />
                </View>
            </SectionCard>

            <SectionCard title="Tracking & Inventory" icon="cube-outline">
                <View style={[styles.formGroupRow, { marginBottom: 0 }]}>
                  <View style={styles.formGroupHalf}>
                    <Text style={styles.inputLabel}>Current Stock</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Left in box"
                      placeholderTextColor="#9BA1A6"
                      keyboardType="number-pad"
                      value={remainingQuantity}
                      onChangeText={(val) => setRemainingQuantity(val.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                  <View style={styles.formGroupHalf}>
                    <Text style={styles.inputLabel}>Original Box Qt.</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Box quantity"
                      placeholderTextColor="#9BA1A6"
                      keyboardType="number-pad"
                      value={quantity}
                      onChangeText={(val) => setQuantity(val.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 20 }}>
                  <Text style={styles.inputLabel}>Low Stock Alert Remaining</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Alert at"
                    placeholderTextColor="#9BA1A6"
                    keyboardType="number-pad"
                    value={reminderThreshold}
                    onChangeText={(val) => setReminderThreshold(val.replace(/[^0-9]/g, ''))}
                  />
                </View>
            </SectionCard>

            <SectionCard title="Clinical Notes" icon="document-text-outline">
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.inputLabel}>Check-In / Review Period</Text>
                  <Text style={styles.inputSubtitle}>How often should we monitor changes to your symptoms?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContainer}>
                    {['Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly'].map((opt) => (
                       <TouchableOpacity 
                         key={opt}
                         style={[styles.chip, reviewPeriod === opt && styles.chipActive]}
                         onPress={() => setReviewPeriod(opt)}
                         activeOpacity={0.8}
                       >
                         <Text style={[styles.chipText, reviewPeriod === opt && styles.chipTextActive]}>{opt}</Text>
                       </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.inputLabel}>Reason for Taking</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    placeholder="e.g. To support immune system, lack of energy..."
                    placeholderTextColor="#9BA1A6"
                    multiline
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>

                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.inputLabel}>Current Symptoms</Text>
                  <View style={styles.symptomInputRow}>
                    <TextInput
                      style={[styles.input, styles.symptomInput]}
                      placeholder="e.g. Brain fog..."
                      placeholderTextColor="#9BA1A6"
                      value={symptomInput}
                      onChangeText={setSymptomInput}
                      onSubmitEditing={addSymptom}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.addSymptomBtn} onPress={addSymptom} activeOpacity={0.8}>
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {symptomList.length > 0 && (
                    <View style={styles.symptomsWrapContainer}>
                      {symptomList.map((symp, idx) => (
                        <View key={idx} style={styles.symptomPill}>
                          <Text style={styles.symptomPillText}>{symp}</Text>
                          <TouchableOpacity onPress={() => removeSymptom(idx)} style={styles.removeSymptomIcon}>
                            <Ionicons name="close" size={14} color="#8A9A83" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View>
                  <Text style={styles.inputLabel}>Additional Info</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    placeholder="e.g. Take with food in the morning..."
                    placeholderTextColor="#9BA1A6"
                    multiline
                    value={instructions}
                    onChangeText={setInstructions}
                  />
                </View>
            </SectionCard>

            <TouchableOpacity 
              style={[styles.saveButton, (!name || !quantity || !dose || isSaving) && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!name || !quantity || !dose || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Optimise Protocol'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.text,
  },
  optionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  promptText: {
    fontSize: 24,
    fontFamily: 'Inter_400Regular',
    color: '#4A5546',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  optionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(138, 154, 131, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  optionTextWrapper: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    color: Colors.light.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#687076',
    fontFamily: 'Inter_400Regular',
  },
  
  // Camera Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 32,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cameraCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  cameraCloseText: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  cameraInstruction: {
    color: 'white',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  cameraBottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 40,
    paddingTop: 16,
  },
  imageStrip: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  previewContainer: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  removeImageIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'black',
    borderRadius: 12,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  photoCountText: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
    width: 100,
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  analyzeButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    width: 100,
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 6,
  },

  // Analyzing Styles
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  analyzingTitle: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 8,
  },
  analyzingSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#687076',
    textAlign: 'center',
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },

  // Manual Form Styles
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#4A5546',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#2D3A28',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: 200,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F3ED',
  },
  suggestionText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#2D3A28',
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#C1C8BD',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  frequencyContainer: {
    marginBottom: 20,
  },
  chipScrollContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  chipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#687076',
  },
  chipTextActive: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  inputSubtitle: {
    fontSize: 13,
    color: '#8A9A83',
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
    marginTop: -4,
  },
  frequencyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    padding: 4,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 154, 131, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#2D3A28',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  ingredientsHeaderRow: {
    marginBottom: 0,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientInputWrapper: {
    flex: 2,
    marginRight: 8,
  },
  ingredientInput: {
    marginBottom: 0,
  },
  ingredientAmount: {
    flex: 0.8,
    marginBottom: 0,
    marginRight: 8,
    textAlign: 'center',
  },
  unitPill: {
    backgroundColor: 'rgba(138, 154, 131, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    minWidth: 50,
  },
  unitPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.light.primary,
  },
  removeIngredientBtn: {
    padding: 8,
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginLeft: 4,
  },
  addIngredientText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.light.primary,
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6DF',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
  },
  sectionContent: {
    padding: 24,
  },
  symptomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  addSymptomBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symptomsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  symptomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 154, 131, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  symptomPillText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#4A5546',
    marginRight: 6,
  },
  removeSymptomIcon: {
    padding: 2,
    backgroundColor: 'rgba(138, 154, 131, 0.1)',
    borderRadius: 10,
  }
});
