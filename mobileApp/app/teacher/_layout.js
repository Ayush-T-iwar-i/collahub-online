import { Drawer } from "expo-router/drawer";
import TeacherDrawer from "./components/TeacherDrawer";

export default function TeacherLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "front",

        drawerStyle: {
          backgroundColor: "transparent",
        },

        sceneContainerStyle: {
          backgroundColor: "#1E1B4B",
        },

        contentStyle: {
          backgroundColor: "transparent",
        },

        

        overlayColor: "rgba(0,0,0,0.4)",
      }}
      drawerContent={(props) => <TeacherDrawer {...props} />}
    >
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="mark-attendance" />
      <Drawer.Screen name="students" />
    </Drawer>
  );
}