import { Drawer } from "expo-router/drawer";
import CustomDrawer from "./components/CustomDrawer";

export default function StudentLayout() {
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