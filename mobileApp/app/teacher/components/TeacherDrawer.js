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
import { useEffect } from "react";

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
        Teacher Drawer
========================= */
export default function TeacherDrawer(props) {
  const router = useRouter();

  const [teacher, setTeacher] = useState(null);
  const [localImage, setLocalImage] = useState(null);

// 🔄 Load Teacher Data


useEffect(() => {
  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem("teacherData");

      if (!data) return;

      const parsed = JSON.parse(data);
      setTeacher(parsed);

      const latestImage = await AsyncStorage.getItem(
        `profileImage_${parsed.teacherId}`
      );

      setLocalImage(latestImage || null);

    } catch (error) {
      console.log("Teacher Drawer Load Error:", error);
    }
  };

  loadData();

}, [localImage]);



  /* 🔥 Logout */
const handleLogout = async () => {
  Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        try {
          await AsyncStorage.multiRemove([
            "teacherToken",
            "teacherData",
            "teacherLoggedIn",
          ]);

          router.replace("/teacher-login");

        } catch (error) {
          console.log("Logout Error:", error);
        }
      },
    },
  ]);
};

  const imageSource =
    localImage ||
    teacher?.profileImage ||
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
          onPress={() => router.push("/teacher/profile")}
        >
          <Image source={{ uri: imageSource }} style={styles.dp} />

          <Text style={styles.name}>
            {teacher?.name || "Teacher Name"}
          </Text>

          <Text style={styles.role}>
            {teacher?.role || "Teacher"}
          </Text>

          <Text style={styles.id}>
            ID: {teacher?.teacherId || "N/A"}
          </Text>
        </Pressable>

        {/* 📌 Menu Items */}

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/teacher/dashboard")}
        >
          <Text style={styles.text}>🏠 Dashboard</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/teacher/profile")}
        >
          <Text style={styles.text}>👤 Profile</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/teacher/mark-attendance")}
        >
          <Text style={styles.text}>📋 Mark Attendance</Text>
        </AnimatedItem>

        <AnimatedItem
          style={styles.item}
          onPress={() => router.push("/teacher/students")}
        >
          <Text style={styles.text}>👥 Students</Text>
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
    backgroundColor: "#1e293b",
  },

  profileSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },

  dp: {
    width: 90,
    height: 90,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#38bdf8",
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  role: {
    fontSize: 14,
    color: "#38bdf8",
    marginTop: 3,
  },

  id: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 3,
  },

  item: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#0f172a",
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
    backgroundColor: "#b91c1c",
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});