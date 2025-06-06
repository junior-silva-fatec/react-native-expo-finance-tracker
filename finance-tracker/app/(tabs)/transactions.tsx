import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ScrollView, Pressable, Dimensions, Animated, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTransactions } from '../../contexts/TransactionContext';
import TransactionItem from '../../components/TransactionItem';
import { Swipeable } from 'react-native-gesture-handler';
import { useCurrency } from '../../contexts/CurrencyContext';
import CategoryFilter from '../../components/CategoryFilter';
import { expenseCategories, incomeCategories } from '../../constants/categories';

type Transaction = {
  id: string;
  amount: number;
  category: string;
  title: string;
  date: string | Date;
  // Add other properties your transaction object uses
};

const { width } = Dimensions.get('window');

const formatAmount = (amount: number, currency: { symbol: string, code: string }) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    currencyDisplay: 'symbol',
  }).format(Math.abs(amount));
};

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: 'apps',
  income: 'trending-up',
  expense: 'trending-down'
};

export default function Transactions() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { transactions, deleteTransaction } = useTransactions();
  const { currency } = useCurrency();

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
  ];

  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTransactions = transactions.filter(transaction => {
    if (selectedType !== 'all' && 
        ((selectedType === 'income' && transaction.amount < 0) || 
         (selectedType === 'expense' && transaction.amount > 0))) {
      return false;
    }
    
    if (selectedCategory && transaction.category !== selectedCategory) {
      return false;
    }
    
    return true;
  });

  const currentCategories = selectedType === 'income' ? incomeCategories : 
                          selectedType === 'expense' ? expenseCategories :
                          [...new Set([...incomeCategories, ...expenseCategories])];

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              await deleteTransaction(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleEdit = (id: string) => {
    router.push({
      pathname: '/transactionForm',
      params: { transactionId: id }
    });
  };

  const renderRightActions = (id: string, dragX: Animated.AnimatedInterpolation<number>) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View 
        style={[
          styles.swipeActions,
          {
            transform: [{ translateX: trans }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteButton]}
          onPress={() => handleDelete(id)}
        >
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Add this state to track if a swipe is in progress
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Improved Summary Card */}
      <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
          {/* Balance Section */}
          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, { color: theme.text.secondary }]}>
              Total Balance
            </Text>
            <Text style={[styles.balanceAmount, { color: theme.text.primary }]}>
              {formatAmount(
                transactions.reduce((sum, t) => sum + t.amount, 0),
                currency
              )}
            </Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Income</Text>
              </View>
              <Text style={[styles.statAmount, { color: '#4CAF50' }]}>
                {formatAmount(
                  transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0),
                  currency
                )}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <View style={[styles.dot, { backgroundColor: '#F44336' }]} />
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Expenses</Text>
              </View>
              <Text style={[styles.statAmount, { color: '#F44336' }]}>
                {formatAmount(
                  Math.abs(transactions.reduce((sum, t) => sum + (t.amount < 0 ? t.amount : 0), 0)),
                  currency
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search transactions..."
            placeholderTextColor={theme.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersWrapper}>
          <Text style={[styles.filterTitle, { color: theme.text.secondary }]}>
            Transaction Type
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.transactionTypeFilter}
          >
            {['all', 'income', 'expense'].map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.filterTypeButton,
                  { 
                    backgroundColor: selectedType === type ? theme.primary : theme.surface,
                    borderColor: theme.border,
                    shadowColor: theme.shadowColor,
                  }
                ]}
                onPress={() => {
                  setSelectedType(type as any);
                  setSelectedCategory(null);
                }}
              >
                <Ionicons 
                  name={typeIcons[type as keyof typeof typeIcons]} 
                  size={16} 
                  color={selectedType === type ? '#fff' : theme.text.primary} 
                  style={styles.filterIcon}
                />
                <Text style={[
                  styles.filterText,
                  { 
                    color: selectedType === type ? '#fff' : theme.text.primary,
                  }
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          
          <CategoryFilter
            categories={currentCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>
      </View>

      {/* Transactions List */}
      <View style={styles.listWrapper}>
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Transaction }) => (
            <Swipeable
              friction={2}
              overshootFriction={8}
              rightThreshold={40}
              renderRightActions={(progress, dragX) => (
                <View style={styles.deleteAction}>
                  <Pressable 
                    style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#fff" />
                  </Pressable>
                </View>
              )}
            >
              <TransactionItem
                {...item}
                title={item.title}
                date={typeof item.date === 'string' ? item.date : item.date.toISOString()}
                onPress={() => handleEdit(item.id)}
              />
            </Swipeable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="credit-card-off-outline" size={64} color={theme.text.secondary} />
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                No Transactions
              </Text>
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                Add your first transaction by tapping the + button
              </Text>
            </View>
          }
        />
      </View>

      {/* FAB */}
      <TouchableOpacity 
        style={[
          styles.addButton,
          { backgroundColor: theme.primary },
        ]}
        activeOpacity={0.7}
        onPress={() => router.push('/transactionForm')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'left',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    marginLeft: 4,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  swipeActions: {
    width: 100,
    height: '100%',
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F44336',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  editButton: {
    backgroundColor: '#2196F3', // Material Blue
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterChipActive: {
    borderWidth: 0,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filtersWrapper: {
    marginTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  transactionTypeFilter: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
});