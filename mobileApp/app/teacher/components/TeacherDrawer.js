// app/teacher/_drawer.js  (ya jo bhi drawer file hai)
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, Pressable,
  Alert, Animated,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";


const SafeImage = ({ uri, size = 44, initials = "?", color = "#a78bfa", style }) => {
  const [hasError, setHasError] = React.useState(false);
  const isValid = uri && !hasError &&
    (uri.startsWith("http://") || uri.startsWith("https://"));

  if (isValid) {
    return (
      <Image
        source={{ uri }}
        style={[{ width:size, height:size, borderRadius:size/2 }, style]}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    );
  }
  return (
    <View style={[{
      width:size, height:size, borderRadius:size/2,
      backgroundColor: color + "22",
      justifyContent:"center", alignItems:"center",
    }, style]}>
      <Text style={{ color, fontSize:size*0.36, fontWeight:"800" }}>
        {(initials||"?").substring(0,2)}
      </Text>
    </View>
  );
};


const MenuItem = ({ icon, label, accent, onPress, index }) => {
  const scale     = React.useRef(new Animated.Value(1)).current;
  const opacity   = React.useRef(new Animated.Value(0)).current;
  const translateX = React.useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue:1, duration:300, delay:index*50, useNativeDriver:true }),
      Animated.spring(translateX, { toValue:0, speed:14, bounciness:4, delay:index*50, useNativeDriver:true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform:[{ scale },{ translateX }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: accent+"15" }]}>
        <View style={[styles.menuIconWrap, { backgroundColor: accent+"20" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={13} color="#1f2937" />
      </Pressable>
    </Animated.View>
  );
};

export default function TeacherDrawer(props) {
  const router = useRouter();
  const [teacher, setTeacher] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("teacherData");
        if (raw) {
          const d = JSON.parse(raw);
          setTeacher(d);
          
          const img = d.profileImage;
          setProfileImage(img && img.startsWith("http") ? img : null);
        }
      } catch (e) {
        console.log("Drawer load error:", e.message);
      }
    })();
  }, []));

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text:"Cancel", style:"cancel" },
      { text:"Logout", style:"destructive", onPress: async () => {
        await AsyncStorage.multiRemove([
          "accessToken","refreshToken",
          "teacherData","teacherLoggedIn",
        ]);
        router.replace("/login");
      }},
    ]);
  };

  const initials = teacher?.name?.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "T";

  const mainMenu = [
    { icon:"home",     label:"Dashboard",      route:"/teacher/dashboard",       accent:"#f59e0b" },
    { icon:"person",   label:"Profile",         route:"/teacher/profile",          accent:"#a78bfa" },
    { icon:"calendar", label:"Mark Attendance", route:"/teacher/mark-attendance",  accent:"#34d399" },
    { icon:"people",   label:"Students",        route:"/teacher/teacher-students", accent:"#60a5fa" },
    { icon:"time",     label:"My Timetable",    route:"/teacher/timetable",        accent:"#f87171" },
    { icon:"book",     label:"My Subjects",     route:"/teacher/my-subjects",      accent:"#fb923c" },
  ];

  const academicMenu = [
    { icon:"document-text", label:"Assignments",   route:"/teacher/assignments",  accent:"#fb923c" },
    { icon:"notifications", label:"Notifications", route:"/teacher/notifications", accent:"#f472b6" },
  ];

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor:"transparent" }}
      contentContainerStyle={{ flexGrow:1 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.container}>

        
        <View style={styles.header}>
          <LinearGradient colors={["#0a1628","#1a1500","#091520"]} style={StyleSheet.absoluteFillObject} />

          <Pressable onPress={() => router.push("/teacher/profile")} style={styles.avatarArea}>
            <View style={styles.avatarRing}>
              
              <SafeImage
                uri={profileImage}
                size={80}
                initials={initials}
                color="#f59e0b"
                style={{ borderRadius:40 }}
              />
            </View>
            <View style={styles.onlineDot} />
          </Pressable>

          <Text style={styles.name} numberOfLines={1}>{teacher?.name || "Teacher"}</Text>
          <Text style={styles.teacherId}>{teacher?.teacherId || ""}</Text>

          {teacher?.department && (
            <View style={styles.deptBadge}>
              <Ionicons name="school-outline" size={10} color="#f59e0b" />
              <Text style={styles.deptBadgeText} numberOfLines={1}>
                {teacher.department.match(/\(([^)]+)\)/)?.[1] || teacher.department.split(" ")[0]}
              </Text>
            </View>
          )}
          {teacher?.college && (
            <Text style={styles.college} numberOfLines={1}>{teacher.college}</Text>
          )}
        </View>

        
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>MAIN</Text>
          {mainMenu.map((item, i) => (
            <MenuItem key={item.route} index={i}
              icon={item.icon} label={item.label} accent={item.accent}
              onPress={() => router.push(item.route)} />
          ))}

          <Text style={styles.sectionLabel}>ACADEMIC</Text>
          {academicMenu.map((item, i) => (
            <MenuItem key={item.route} index={i + mainMenu.length}
              icon={item.icon} label={item.label} accent={item.accent}
              onPress={() => router.push(item.route)} />
          ))}
        </View>

        <View style={styles.divider} />

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </View>
          <Text style={styles.logoutLabel}>Logout</Text>
          <Ionicons name="chevron-forward" size={13} color="#7f1d1d" />
        </Pressable>

        
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>COLLAHUB v1.0.0</Text>
          </View>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex:1, backgroundColor:"#080d17" },
  header:         { padding:24, paddingTop:50, paddingBottom:24, alignItems:"center", borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)", overflow:"hidden" },
  avatarArea:     { position:"relative", marginBottom:14 },
  avatarRing:     { width:86, height:86, borderRadius:43, borderWidth:2.5, borderColor:"#f59e0b", padding:3, justifyContent:"center", alignItems:"center", backgroundColor:"rgba(245,158,11,0.08)" },
  onlineDot:      { position:"absolute", bottom:3, right:3, width:16, height:16, borderRadius:8, backgroundColor:"#34d399", borderWidth:2.5, borderColor:"#080d17" },
  name:           { color:"#f1f5f9", fontSize:18, fontWeight:"800", letterSpacing:0.2 },
  teacherId:      { color:"#475569", fontSize:12, marginTop:4, marginBottom:6 },
  deptBadge:      { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(245,158,11,0.12)", paddingHorizontal:10, paddingVertical:4, borderRadius:12, marginBottom:6, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  deptBadgeText:  { color:"#f59e0b", fontSize:10, fontWeight:"700" },
  college:        { color:"#334155", fontSize:11, textAlign:"center" },
  menuSection:    { padding:16, paddingTop:18 },
  sectionLabel:   { color:"#1e2d3d", fontSize:9, fontWeight:"800", letterSpacing:2, marginBottom:8, marginTop:8, marginLeft:4 },
  menuItem:       { flexDirection:"row", alignItems:"center", paddingVertical:11, paddingHorizontal:12, borderRadius:14, marginBottom:3 },
  menuIconWrap:   { width:36, height:36, borderRadius:11, justifyContent:"center", alignItems:"center", marginRight:12 },
  menuLabel:      { flex:1, color:"#94a3b8", fontSize:14, fontWeight:"600" },
  divider:        { height:1, backgroundColor:"rgba(255,255,255,0.04)", marginHorizontal:16, marginBottom:14 },
  logoutBtn:      { flexDirection:"row", alignItems:"center", marginHorizontal:16, padding:14, borderRadius:14, backgroundColor:"rgba(239,68,68,0.07)", borderWidth:1, borderColor:"rgba(239,68,68,0.12)", marginBottom:8 },
  logoutIcon:     { width:34, height:34, borderRadius:10, backgroundColor:"rgba(239,68,68,0.14)", justifyContent:"center", alignItems:"center", marginRight:12 },
  logoutLabel:    { flex:1, color:"#f87171", fontSize:14, fontWeight:"700" },
  footer:         { alignItems:"center", paddingBottom:24, paddingTop:8 },
  footerBadge:    { flexDirection:"row", alignItems:"center", gap:6 },
  footerDot:      { width:6, height:6, borderRadius:3, backgroundColor:"#34d399" },
  footerText:     { color:"#1e2d3d", fontSize:11, fontWeight:"600" },
});