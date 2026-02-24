
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

/* Animated Button */
const AnimatedItem = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function TeacherDrawer(props) {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const data = await AsyncStorage.getItem("teacherData");
        if (data) {
          setTeacher(JSON.parse(data));
        }
      };
      loadData();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("teacherToken");
          await AsyncStorage.removeItem("teacherData");
          router.replace("/teacher-login");
        },
      },
    ]);
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.container}>

        <View style={styles.profileSection}>
          <Image
            source={{
              uri:
                teacher?.profileImage ||
                "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            }}
            style={styles.dp}
          />

          <Text style={styles.name}>
            {teacher?.name || "Teacher Name"}
          </Text>

          <Text style={styles.id}>
            {teacher?.teacherId || "Teacher ID"}
          </Text>
        </View>

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

        <AnimatedItem style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </AnimatedItem>

      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#111827",
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 25,
  },
  dp: {
    width: 90,
    height: 90,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: "#8B5CF6",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  id: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#1F2937",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  logout: {
    marginTop: 30,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#7C2D12",
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
