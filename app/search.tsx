import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { formatXAF } from '@/constants/Currency';
import { fuzzySearchProducts } from '@/data/productsRepo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const HISTORY_KEY = 'search_history_v1';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        setHistory(raw ? JSON.parse(raw) : []);
      } catch {}
    })();
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [] as ReturnType<typeof fuzzySearchProducts>;
    return fuzzySearchProducts(query.trim(), 25);
  }, [query]);

  const saveHistory = async (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    const next = [cleaned, ...history.filter((h) => h.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10);
    setHistory(next);
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  };

  const onSubmit = async () => {
    if (!query.trim()) return;
    await saveHistory(query);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.name}>{item.name}</ThemedText>
        <ThemedText style={styles.meta}>
          {item.variant?.sizeLabel ? `${item.variant.sizeLabel} • ` : ''}{formatXAF(item.variant?.priceXaf ?? 0)} • Qty {item.variant?.quantity ?? 0}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen title="Search">
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          style={styles.input}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity>
          <Ionicons name="mic" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {query.trim().length === 0 ? (
        <>
          {history.length > 0 ? (
            <View style={styles.historyWrap}>
              <View style={styles.historyHeader}>
                <ThemedText type="subtitle">Recent</ThemedText>
                <TouchableOpacity onPress={async () => { setHistory([]); await AsyncStorage.removeItem(HISTORY_KEY); }}>
                  <ThemedText>Clear</ThemedText>
                </TouchableOpacity>
              </View>
              {history.map((h) => (
                <TouchableOpacity key={h} style={styles.historyItem} onPress={() => setQuery(h)}>
                  <Ionicons name="time" size={16} color="#6b7280" />
                  <ThemedText style={{ marginLeft: 8 }}>{h}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search" size={56} color="#9ca3af" />
              <ThemedText style={{ marginTop: 8 }}>Type to search products</ThemedText>
            </View>
          )}
        </>
      ) : (
        <FlatList data={suggestions} keyExtractor={(it) => it.key} renderItem={renderItem} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  name: { fontSize: 16 },
  meta: { fontSize: 14, color: '#6b7280' },
  historyWrap: { paddingTop: 8 },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});


