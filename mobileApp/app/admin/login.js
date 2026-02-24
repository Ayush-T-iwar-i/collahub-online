import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native-paper";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0f2027", "#203a43", "#2c5364"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.container}>
        <Text style={styles.title}>Admin Login</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#ccc"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#ccc"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, color: "#fff", marginBottom: 30 },
  input: {
    width: 280,
    backgroundColor: "#ffffff20",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    color: "#fff",
  },
  btn: {
    backgroundColor: "#00c6ff",
    padding: 15,
    width: 280,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff" },
});
