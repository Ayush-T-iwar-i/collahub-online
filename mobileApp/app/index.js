import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function LandingPage() {
  const router = useRouter();

  const fade = useSharedValue(0);
  const slide = useSharedValue(80);

  useEffect(() => {
    fade.value = withTiming(1, { duration: 1200 });
    slide.value = withSpring(0);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: slide.value }],
  }));

  const RoleButton = ({ title, route }) => (
    <Pressable onPress={() => router.replace(route)}>
      <Animated.View style={styles.buttonWrapper}>
        <LinearGradient
          colors={["#00f5ff", "#00c6ff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#0f2027", "#203a43", "#2c5364"]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.container, animatedStyle]}>
        <BlurView intensity={100} tint="dark" style={styles.card}>
          <Text style={styles.title}>COLLAHUB</Text>
          <Text style={styles.subtitle}>
            Smart College Management Platform
          </Text>

<RoleButton title="Student" route="/student-login" />
          <RoleButton title="Teacher" route="/teacher/login" />
          <RoleButton title="Admin" route="/admin/login" />
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: width > 500 ? 500 : "90%",
    padding: 40,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  buttonWrapper: {
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});