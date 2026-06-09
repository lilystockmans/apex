import 'react-native-get-random-values';
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { v4 as uuidv4 } from 'uuid';
import {
  RECORDING_TASK,
  startSensorListeners,
  stopSensorListeners,
} from '../../lib/recording-task';
import {
  createRideSession,
  finalizeRideSession,
  discardSession,
  recoverSession,
  getRidePoints,
  getRideSessions,
  getIncompleteSession,
  kvGet,
  kvSet,
} from '../../lib/storage';
import { scoreRide, updateRollingBaseline } from '../../lib/analytics';
import { getCurrentLevel } from '../../lib/curriculum';
import { assignDrill } from '../../lib/insights';
import { requestNotificationPermission, scheduleWeeklyScoreNotification, sendLevelUpNotification } from '../../lib/notifications';
import { getCalibration } from '../../lib/calibration';
import { RideSession } from '../../types/ride';

const GPS_ACCURACY_THRESHOLD = 15; // metres
const AUTO_STOP_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_STOP_WINDOW_S = 30 * 60; // 30 minutes of data to check
const AUTO_STOP_SPEED_KMH = 5;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RecordScreen() {
  const [recording, setRecording] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: check for incomplete session from a previous crash
  useEffect(() => {
    const incomplete = getIncompleteSession();
    if (incomplete) {
      Alert.alert(
        'Previous ride interrupted',
        'A ride was recording when the app closed. What would you like to do?',
        [
          {
            text: 'Recover',
            onPress: () => handleRecover(incomplete),
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => discardSession(incomplete.id),
          },
        ],
        { cancelable: false }
      );
    }
  }, []);

  // GPS warm-up watch — runs until fix acquired
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation },
        (loc) => {
          const acc = loc.coords.accuracy ?? 999;
          setGpsAccuracy(acc);
          if (acc < GPS_ACCURACY_THRESHOLD) {
            setGpsReady(true);
            sub?.remove();
          }
        }
      ).then((s) => {
        sub = s;
      });
    });

    return () => {
      sub?.remove();
    };
  }, []);

  function handleRecover(session: RideSession) {
    const points = getRidePoints(session.id);
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += haversineDistance(
        points[i - 1].lat, points[i - 1].lon,
        points[i].lat, points[i].lon
      );
    }
    const duration =
      points.length > 0
        ? Math.round((points[points.length - 1].ts - points[0].ts) / 1000)
        : 0;
    recoverSession(session.id, Date.now(), distance, duration);
  }

  async function handleStartRecording() {
    if (!getCalibration()) {
      Alert.alert('Calibration needed', 'Go to Settings → Calibrate before recording.');
      return;
    }

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (fgStatus !== 'granted' || bgStatus !== 'granted') {
      Alert.alert(
        'Permissions required',
        'Both foreground and background location access are needed to record rides.'
      );
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    createRideSession(id, now);
    kvSet('active_session_id', id);
    setSessionId(id);

    await Notifications.setNotificationChannelAsync('ride-recording', {
      name: 'Ride Recording',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Apex is recording your ride',
        body: 'Tap to return to app',
        sticky: true,
      },
      trigger: null,
    });

    await Location.startLocationUpdatesAsync(RECORDING_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Apex — Recording ride',
        notificationBody: 'Tap to return',
        notificationColor: '#FF6B35',
      },
    });

    startSensorListeners();
    setStartTime(now);
    setRecording(true);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Auto-stop: average speed < 5 km/h over last 30 min → end ride
    autoStopRef.current = setInterval(async () => {
      const sid = kvGet('active_session_id');
      if (!sid) return;
      const points = getRidePoints(sid);
      const cutoff = Date.now() - AUTO_STOP_WINDOW_S * 1000;
      const recent = points.filter((p) => p.ts >= cutoff);
      if (recent.length < 2) return;
      const avgSpeed = recent.reduce((sum, p) => sum + p.speed_mps, 0) / recent.length;
      if (avgSpeed * 3.6 < AUTO_STOP_SPEED_KMH) {
        await doStop(id, now);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Ride ended automatically',
            body: 'Tap to review your ride',
          },
          trigger: null,
        });
      }
    }, AUTO_STOP_CHECK_INTERVAL_MS);
  }

  const doStop = useCallback(async (sid: string, start: number) => {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(RECORDING_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(RECORDING_TASK);
    }

    stopSensorListeners();
    kvSet('active_session_id', '');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearInterval(autoStopRef.current);
      autoStopRef.current = null;
    }

    const ended_at = Date.now();
    const points = getRidePoints(sid);
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += haversineDistance(
        points[i - 1].lat, points[i - 1].lon,
        points[i].lat, points[i].lon
      );
    }
    const duration = Math.round((ended_at - start) / 1000);
    finalizeRideSession(sid, ended_at, distance, duration);

    const scores = scoreRide(sid);
    updateRollingBaseline(scores);

    // Level-up check: fire notification and assign new drill if level changed
    const levelBefore = kvGet('last_known_level');
    const newLevel = getCurrentLevel();
    if (levelBefore && levelBefore !== newLevel.id) {
      sendLevelUpNotification(newLevel.label);
      assignDrill();
    }
    kvSet('last_known_level', newLevel.id);

    // Request notification permission and schedule weekly score after 3rd ride
    const sessions = getRideSessions();
    if (sessions.length === 3) {
      await requestNotificationPermission();
      await scheduleWeeklyScoreNotification();
    }

    await Notifications.dismissAllNotificationsAsync();

    setRecording(false);
    setSessionId(null);
    setElapsed(0);
    setStartTime(null);
  }, []);

  async function onStopPress() {
    if (!sessionId || !startTime) return;
    await doStop(sessionId, startTime);
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Record Ride</Text>

      <View style={styles.gpsRow}>
        <View style={[styles.gpsIndicator, { backgroundColor: gpsReady ? '#4CAF50' : '#FF9800' }]} />
        <Text style={styles.gpsText}>
          {gpsReady
            ? 'GPS ready'
            : gpsAccuracy !== null
            ? `Waiting for GPS fix… ${Math.round(gpsAccuracy)}m`
            : 'Acquiring GPS…'}
        </Text>
      </View>

      {recording && (
        <View style={styles.statsBox}>
          <Text style={styles.elapsed}>{formatDuration(elapsed)}</Text>
          <Text style={styles.statsLabel}>recording</Text>
        </View>
      )}

      {!recording ? (
        <TouchableOpacity
          style={[styles.button, styles.startButton, !gpsReady && styles.buttonDisabled]}
          onPress={handleStartRecording}
          disabled={!gpsReady}
        >
          <Text style={styles.buttonText}>Start Ride</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={onStopPress}>
          <Text style={styles.buttonText}>Stop Ride</Text>
        </TouchableOpacity>
      )}

      {!gpsReady && !recording && (
        <Text style={styles.hint}>Move outside for better GPS signal</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gpsText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  statsBox: {
    alignItems: 'center',
  },
  elapsed: {
    color: '#FF6B35',
    fontSize: 56,
    fontWeight: '700',
  },
  statsLabel: {
    color: '#AAAAAA',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 48,
    minWidth: 200,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#FF6B35',
  },
  stopButton: {
    backgroundColor: '#CC3300',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
