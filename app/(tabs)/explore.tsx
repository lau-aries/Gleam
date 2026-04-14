import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Pressable 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Supplement } from '@/context/CabinetContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function CabinetScreen() {
  const router = useRouter();
  const { useCabinet } = require('@/context/CabinetContext');
  const { cabinetItems, loading } = useCabinet();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock'>('name');

  const filteredItems = useMemo(() => {
    let result = [...cabinetItems];
    if (searchQuery) {
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.currentStock - b.currentStock;
    });
  }, [cabinetItems, searchQuery, sortBy]);

  const renderItem = ({ item }: { item: Supplement }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => router.push({ pathname: '/add-supplement', params: { editId: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
           <Ionicons name="leaf" size={20} color={Colors.light.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <View style={styles.stockBadge}>
           <Text style={styles.stockLabel}>Stock</Text>
           <Text style={[styles.stockValue, item.currentStock <= item.lowStockAlertQuantity && { color: '#E54D2E' }]}>
             {item.currentStock}
           </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9F8', '#F1F3F1']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Your Cabinet</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-supplement')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8A9A83" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search your cabinet..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={[styles.flexCenter, { marginTop: 40 }]}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading supplements...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={64} color="#C1C8BD" />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySubtitle}>Start building your inventory by adding your first supplement.</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/add-supplement')}
          >
            <Text style={styles.emptyButtonText}>Add Supplement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#2D3A28',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    marginBottom: 20,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#2D3A28',
  },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E6DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F3F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: '#2D3A28' },
  itemCategory: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#8A9A83', marginTop: 2 },
  stockBadge: { alignItems: 'flex-end' },
  stockLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#8A9A83', textTransform: 'uppercase' },
  stockValue: { fontSize: 20, fontFamily: 'PlayfairDisplay_700Bold', color: Colors.light.primary },
  flexCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#8A9A83', fontFamily: 'Inter_500Medium' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 60 },
  emptyTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold', color: '#2D3A28', marginTop: 20 },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#687076', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  emptyButton: { backgroundColor: Colors.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, marginTop: 24 },
  emptyButtonText: { color: 'white', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
