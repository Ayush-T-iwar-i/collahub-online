import { Drawer } from "expo-router/drawer";
import CustomDrawer from "./components/CustomDrawer";

export default function StudentLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerStyle: { backgroundColor: "transparent" },
        sceneContainerStyle: { backgroundColor: "#1E1B4B" },
        contentStyle: { backgroundColor: "transparent" },
        overlayColor: "rgba(34, 33, 33, 0.4)",
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen name="dashboard"   options={{ headerShown: false }} />
      <Drawer.Screen name="profile"     options={{ headerShown: false }} />
      <Drawer.Screen name="attendance"  options={{ headerShown: false }} />
      <Drawer.Screen name="my-subjects" options={{ headerShown: false }} />
      <Drawer.Screen name="notes"       options={{ headerShown: false }} />
      <Drawer.Screen name="timetable"   options={{ headerShown: false }} />
    </Drawer>
  );
}