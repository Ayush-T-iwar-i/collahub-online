import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  StatusBar,
} from "react-native";
import { Text } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";

const BASE_URL = "http://10.0.2.2:5000";


export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email;

  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert("Error", "Enter OTP");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Invalid OTP");
        return;
      }

      Alert.alert("Success", "Account Verified 🎉", [
        {
          text: "Login Now",
          onPress: () => router.replace("/student-login"),
        },
      ]);
    } catch (error) {
      Alert.alert("Network Error", "Server not reachable");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>OTP sent to: {email}</Text>

      <TextInput
        placeholder="Enter 6-digit OTP"
        style={styles.input}
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      <Pressable style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 20,
    color: "gray",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#00c6ff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
