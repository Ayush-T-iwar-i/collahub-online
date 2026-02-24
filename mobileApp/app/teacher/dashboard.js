import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  BackHandler,
  ToastAndroid,
  StatusBar,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter, useFocusEffect } from "expo-router";

export default function TeacherDashboard() {
  const navigation = useNavigation();
  const router = useRouter();

  const [image, setImage] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const backPressCount = useRef(0);

  // 🔐 AUTH CHECK
  useFocusEffect(
    useCallback(() => {
      const checkLogin = async () => {
        const token = await AsyncStorage.getItem("teacherToken");

        if (!token) {
          router.replace("/teacher-login");
        } else {
          setCheckingAuth(false);
        }
      };

      checkLogin();
    }, [])
  );

  // 🔥 DOUBLE BACK TO EXIT
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;

          ToastAndroid.show(
            "Press back again to exit",
            ToastAndroid.SHORT
          );

          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);

          return true;
        }

        BackHandler.exitApp();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  // 👤 Load Profile Image
  useFocusEffect(
    useCallback(() => {
      const loadImage = async () => {
        const teacherData = await AsyncStorage.getItem("teacherData");

        if (teacherData) {
          const parsed = JSON.parse(teacherData);

          const saved = await AsyncStorage.getItem(
            `teacherProfile_${parsed.teacherId}`
          );

          if (saved) {
            setImage(saved);
          } else {
            setImage(null);
          }
        }
      };

      loadImage();
    }, [])
  );

  const openDrawer = () => {
    navigation.openDrawer();
  };

  if (checkingAuth) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={openDrawer}>
          <Ionicons name="menu" size={28} color="#ffffff" />
        </Pressable>

        <Text style={styles.title}>Teacher Dashboard</Text>

        <Image
          source={{
            uri:
              image ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.image}
        />
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <Text style={styles.welcomeText}>
          Welcome Teacher 👨‍🏫
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1B4B",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1B4B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 55,
    backgroundColor: "#4C1D95",
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  image: {
    width: 45,
    height: 45,
    borderRadius: 22,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1B4B",
  },
  welcomeText: {
    color: "white",
    fontSize: 16,
  },
});