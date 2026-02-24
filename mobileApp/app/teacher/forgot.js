import React from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native-paper";

export default function TeacherForgot() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#42275a", "#734b6d"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>

        <TextInput
          placeholder="Enter Email"
          placeholderTextColor="#ccc"
          style={styles.input}
        />

        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>Send Reset Link</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:"center", alignItems:"center" },
  title:{ fontSize:26, color:"#fff", marginBottom:30 },
  input:{
    width:280,
    backgroundColor:"#ffffff20",
    padding:15,
    borderRadius:10,
    marginBottom:15,
    color:"#fff"
  },
  btn:{
    backgroundColor:"#00c6ff",
    padding:15,
    width:280,
    borderRadius:10,
    alignItems:"center"
  },
  btnText:{ color:"#fff" }
});
