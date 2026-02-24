import { Drawer } from "expo-router/drawer";
import TeacherDrawer from "./components/TeacherDrawer";

export default function TeacherLayout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <TeacherDrawer {...props} />}
    >
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="mark-attendance" />
      <Drawer.Screen name="students" />
    </Drawer>
  );
}