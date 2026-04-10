import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="day/[date]"
          options={{ title: '', headerBackTitle: '返回' }}
        />
        <Stack.Screen
          name="upload"
          options={{
            title: '添加媒体',
            presentation: 'modal',
            headerBackTitle: '取消',
          }}
        />
        <Stack.Screen
          name="media/[id]"
          options={{
            title: '',
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="location/[id]"
          options={{ title: '', headerBackTitle: '返回' }}
        />
      </Stack>
    </>
  );
}
