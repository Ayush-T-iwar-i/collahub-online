import { Drawer } from "expo-router/drawer";
import CustomDrawer from "./components/CustomDrawer";

export default function StudentLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: "slide",

        // Drawer background
        drawerStyle: {
          backgroundColor: "transparent",
        },
        sceneContainerStyle: {
  backgroundColor: "transparent",
},

        // Main screen background (IMPORTANT)
        contentStyle: {
          backgroundColor: "transparent",
        },

        // Overlay behind drawer
        overlayColor: "rgba(34, 33, 33, 0.4)",
        
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="attendance" />
      <Drawer.Screen name="notes" />
      <Drawer.Screen name="timetable" />
    </Drawer>
  );
}