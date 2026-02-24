import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api"; // 👈 adjust path if needed

const { width } = Dimensions.get("window");

export default function StudentLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withTiming(0, { duration: 800 });
    scale.value = withRepeat(withTiming(1.1, { duration: 10000 }), -1, true);
  }, []);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace("/");
          return true;
        }
      );
      return () => subscription.remove();
    }, [])
  );

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/student/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;

      await AsyncStorage.setItem(
        "studentEmail",
        email.trim().toLowerCase()
      );

      if (data.accessToken) {
        await AsyncStorage.setItem("accessToken", data.accessToken);
      }

      await AsyncStorage.setItem("studentToken", "loggedIn");

      if (data.user) {
        await AsyncStorage.setItem(
          "studentData",
          JSON.stringify(data.user)
        );
      }

      router.replace("/student/dashboard");

    } catch (error) {
      console.log("LOGIN ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "Server not reachable"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <Animated.Image
        source={require("../../assets/login-bg.jpg")}
        style={[StyleSheet.absoluteFillObject, animatedBgStyle]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.7)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.container, animatedCardStyle]}>
        <BlurView intensity={80} tint="dark" style={styles.card}>
          <Text style={styles.title}>Student Login</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#aaa"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#aaa"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.loginBtn} onPress={handleLogin}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push("/student/register")}>
            <Text style={styles.link}>Create Account</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/student/forgot")}>
            <Text style={styles.link}>Forgot Password?</Text>
          </Pressable>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    width: width > 500 ? 500 : "90%",
    padding: 30,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    color: "#fff",
  },
  loginBtn: {
    backgroundColor: "#0077B5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  link: {
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 8,
  },
});