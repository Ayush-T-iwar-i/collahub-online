// app/teacher/result.js
import React from "react";
import { View, Text, StyleSheet, Pressable, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function TeacherResult() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/teacher/dashboard")}
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Student Results</Text>
        <View style={{ width:40 }} />
      </LinearGradient>
      <View style={styles.body}>
        <View style={styles.iconBox}>
          <Ionicons name="bar-chart-outline" size={48} color="#a78bfa" />
        </View>
        <Text style={styles.title}>Student Results</Text>
        <Text style={styles.sub}>
          View student assignment marks and performance in the Assignments section.
        </Text>
        <Pressable style={styles.btn} onPress={() => router.push("/teacher/assignments")}>
          <Ionicons name="document-text-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Go to Assignments</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex:1, backgroundColor:"#080d17" },
  header:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:     { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerTitle: { color:"#fff", fontSize:18, fontWeight:"800" },
  body:        { flex:1, justifyContent:"center", alignItems:"center", padding:32, gap:16 },
  iconBox:     { width:96, height:96, borderRadius:48, backgroundColor:"rgba(167,139,250,0.12)", justifyContent:"center", alignItems:"center", marginBottom:8, borderWidth:1, borderColor:"rgba(167,139,250,0.25)" },
  title:       { color:"#fff", fontSize:18, fontWeight:"800", textAlign:"center" },
  sub:         { color:"#64748b", fontSize:13, textAlign:"center", lineHeight:20 },
  btn:         { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#7c3aed", paddingHorizontal:20, paddingVertical:12, borderRadius:12, marginTop:8 },
  btnText:     { color:"#fff", fontSize:14, fontWeight:"700" },
});