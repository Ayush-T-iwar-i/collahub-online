import { Drawer } from "expo-router/drawer";
import TeacherDrawer from "./components/TeacherDrawer";

export default function TeacherLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: { backgroundColor: "transparent" },
        sceneContainerStyle: { backgroundColor: "#1E1B4B" },
        contentStyle: { backgroundColor: "transparent" },
        overlayColor: "rgba(0,0,0,0.4)",
      }}
      drawerContent={(props) => <TeacherDrawer {...props} />}
    >
      <Drawer.Screen name="dashboard" options={{ headerShown: false }} />
      <Drawer.Screen name="profile" options={{ headerShown: false }} />
      <Drawer.Screen name="mark-attendance" options={{ headerShown: false }} />
      <Drawer.Screen name="my-subjects" options={{ headerShown: false }} />
      <Drawer.Screen name="teacher-students" options={{ headerShown: false }} />
      <Drawer.Screen name="assignments" options={{ headerShown: false }} />
    </Drawer>
  );
}