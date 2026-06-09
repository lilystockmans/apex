import * as Notifications from 'expo-notifications';
import { kvGet, kvSet } from './storage';

export async function requestNotificationPermission() {
  await Notifications.setNotificationChannelAsync('apex-coaching', {
    name: 'Apex Coaching',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const { status } = await Notifications.requestPermissionsAsync();
  kvSet('notifications_permission', status);
  return status;
}

export async function scheduleWeeklyScoreNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your weekly riding score is ready',
      body: 'Open Apex to see how your technique improved this week.',
    },
    trigger: {
      weekday: 2,
      hour: 9,
      minute: 0,
      repeats: true,
    } as any,
  });
}

export async function sendLevelUpNotification(levelLabel: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You reached ${levelLabel}!`,
      body: 'Open Apex to see your new drill and what comes next.',
    },
    trigger: null,
  });
}

export async function sendInactivityNudge() {
  const lastRide = kvGet('last_ride_ts');
  if (!lastRide) return;
  const daysSinceRide = (Date.now() - parseInt(lastRide, 10)) / (1000 * 60 * 60 * 24);
  if (daysSinceRide >= 7) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Haven't ridden in a week",
        body: 'Your active drill is waiting. Even a short ride counts.',
      },
      trigger: null,
    });
  }
}
