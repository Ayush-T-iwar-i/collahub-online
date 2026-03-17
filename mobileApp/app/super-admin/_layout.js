// app/super-admin/_layout.js
import { Stack } from "expo-router";

export default function SuperAdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard"     />
      <Stack.Screen name="colleges"      />
      <Stack.Screen name="manage-admins" />
      <Stack.Screen name="students"      />
      <Stack.Screen name="teachers"      />
      <Stack.Screen name="analytics"     />
      <Stack.Screen name="results"       />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="attendance"    />
      <Stack.Screen name="finance"       />
      <Stack.Screen name="posts"         />
      <Stack.Screen name="subjects"      />
      <Stack.Screen name="settings"      />
    </Stack>
  );
}
