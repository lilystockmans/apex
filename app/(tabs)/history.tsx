import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getRideSessions } from '../../lib/storage';
import { RideSession } from '../../types/ride';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

function RideRow({ ride, onPress }: { ride: RideSession; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowDate}>{formatDate(ride.started_at)}</Text>
        <Text style={styles.rowTime}>{formatTime(ride.started_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowStat}>{formatDistance(ride.distance_m)}</Text>
        <Text style={styles.rowStatLabel}>{formatDuration(ride.duration_s)}</Text>
      </View>
      {ride.status === 'recovered' && (
        <View style={styles.recoveredBadge}>
          <Text style={styles.recoveredText}>recovered</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [rides, setRides] = useState<RideSession[]>([]);
  const router = useRouter();

  useFocusEffect(() => {
    setRides(getRideSessions());
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ride History</Text>

      {rides.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No rides yet.</Text>
          <Text style={styles.emptyHint}>Head to the Record tab to start your first ride.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RideRow ride={item} onPress={() => router.push(`/ride/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLeft: {
    flex: 1,
  },
  rowDate: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rowTime: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowStat: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '700',
  },
  rowStatLabel: {
    color: '#888888',
    fontSize: 13,
    marginTop: 2,
  },
  recoveredBadge: {
    marginLeft: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recoveredText: {
    color: '#AAAAAA',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#1E1E1E',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHint: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
  },
});
