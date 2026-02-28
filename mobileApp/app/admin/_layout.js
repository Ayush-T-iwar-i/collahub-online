import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="forgot" />
      <Stack.Screen name="manage-students" />
      <Stack.Screen name="manage-teachers" />
      <Stack.Screen name="manage-subjects" />
      <Stack.Screen name="manage-timetable" />
      <Stack.Screen name="view-attendance" />
      <Stack.Screen name="post-notice" />
    </Stack>
  );
}