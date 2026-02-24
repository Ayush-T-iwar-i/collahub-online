import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  Animated,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

/* =========================
   Animated Button Component
========================= */
const AnimatedItem = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

/* =========================
        Custom Drawer
========================= */
export default function CustomDrawer(props) {
  const router = useRouter();

  const [student, setStudent] = useState(null);
  const [localImage, setLocalImage] = useState(null);

  // 🔄 Load Student Data
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const data = await AsyncStorage.getItem("studentData");

          if (data) {
            const parsed = JSON.parse(data);
            setStudent(parsed);

            const savedImage = await AsyncStorage.getItem(
              `profileImage_${parsed.studentId}`
            );

            setLocalImage(savedImage || null);
          }
        } catch (error) {
          console.log("Drawer Load Error:", error);
        }
      };

      loadData();
    }, [])
  );

  // 🔥 Logout
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("studentToken");
          await AsyncStorage.removeItem("studentData");
          router.replace("/student-login");
        },
      },
    ]);
  };

  const imageSource =
    localImage ||
    student?.profileImage ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={{ flex: 1 }}
    >
      <View style={styles.container}>
        {/* 👤 Profile Section */}
        <Pressable
          style={styles.profileSection}
          onPress={() => router.push("/student/profile")}
        >
          <Image source={{ uri: imageSource }} style={styles.dp} />

          <Text style={styles.name}>
            {student?.name || "Student Name"}
          </Text>

          <Text style={styles.id}>
            {student?.studentId || "Student ID"}
          </Text>
        </Pressable>

        {/* 📌 Menu Items (ALL Animated) */}

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/student/dashboard")}
        >
          <Text style={styles.text}>🏠 Dashboard</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/student/profile")}
        >
          <Text style={styles.text}>👤 Profile</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/student/attendance")}
        >
          <Text style={styles.text}>📊 Attendance</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/student/notes")}
        >
          <Text style={styles.text}>📚 Notes</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/student/timetable")}
        >
          <Text style={styles.text}>🗓 Timetable</Text>
        </AnimatedItem>

        {/* 🚪 Logout */}
        <AnimatedItem style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </AnimatedItem>
      </View>
    </DrawerContentScrollView>
  );
}

/* =========================
            Styles
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: -40,
    padding: 20,
    borderTopRightRadius: 70,
    borderTopLeftRadius: 70,
    borderBottomRightRadius: 250,
    overflow: "hidden",
    backgroundColor: "#2c343b",
  },

  profileSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#fafcff",
  },

  dp: {
    width: 90,
    height: 90,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#feffff",
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  id: {
    fontSize: 15,
    color: "#94A3B8",
    marginTop: 3,
  },

  item: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#1E293B",
  },

  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E2E8F0",
  },

  logout: {
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#7F1D1D",
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});