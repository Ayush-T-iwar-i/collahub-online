import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl, ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import API from "../../services/api";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_COLORS = {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#fbbf24", Friday:"#f87171", Saturday:"#fb923c",
};

export default function StudentTimetable() {
  const navigation  = useNavigation();
  const [schedule,    setSchedule]    = useState({});
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay() - 1] || "Monday"
  );
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadTimetable(); }, []));

  const loadTimetable = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else           setLoading(true);

      // ✅ FIXED: correct route
      const res = await API.get("/subject-requests/student-timetable");
      setSchedule(res.data?.timetable || {});
    } catch (error) {
      console.log("Timetable load error:", error.message);
      setSchedule({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const daySlots = (schedule[selectedDay] || [])
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const dayColor  = DAY_COLORS[selectedDay] || "#00c6ff";
  const todayName = DAYS[new Date().getDay() - 1] || "Monday";
  const totalSlots = Object.values(schedule).reduce((acc, s) => acc + s.length, 0);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* HEADER */}
      <LinearGradient colors={["#0f1923","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Timetable</Text>
          <Text style={styles.headerSub}>{totalSlots} total classes</Text>
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      {/* TODAY BANNER */}
      <View style={[styles.todayBanner, { backgroundColor:dayColor+"18", borderColor:dayColor+"33" }]}>
        <Ionicons name="today-outline" size={16} color={dayColor} />
        <Text style={[styles.todayText, { color:dayColor }]}>
          {selectedDay} — {daySlots.length} {daySlots.length === 1 ? "class" : "classes"}
        </Text>
      </View>

      {/* DAY TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {DAYS.map(day => {
          const isActive = day === selectedDay;
          const color    = DAY_COLORS[day];
          const count    = (schedule[day] || []).length;
          const isToday  = day === todayName;
          return (
            <Pressable key={day} onPress={() => setSelectedDay(day)}
              style={[
                styles.tab,
                isActive && { backgroundColor:color, borderColor:color },
                isToday && !isActive && { borderColor:color+"55" },
              ]}>
              <Text style={[styles.tabDay, isActive && { color:"#fff" }]}>
                {day.slice(0,3)}{isToday ? " •" : ""}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, {
                  backgroundColor: isActive ? "rgba(255,255,255,0.3)" : color+"33"
                }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? "#fff" : color }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* SLOTS */}
      <FlatList
        data={daySlots}
        keyExtractor={(item, i) => `${item.subjectName}_${item.startTime}_${i}`}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTimetable(true)} tintColor="#00c6ff" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="cafe-outline" size={56} color="#1f2937" />
            <Text style={styles.emptyTitle}>No Classes</Text>
            <Text style={styles.emptyText}>
              {selectedDay === todayName
                ? "No classes today. Enjoy your free time!"
                : `No classes on ${selectedDay}.`}
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View style={styles.slotRow}>
            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={[styles.timelineDot, { backgroundColor:dayColor }]} />
              {index < daySlots.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Card */}
            <View style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View style={{ flex:1 }}>
                  <Text style={styles.slotSubject} numberOfLines={1}>
                    {item.subjectName}
                  </Text>
                  {item.subjectCode ? (
                    <View style={[styles.codeBadge, { backgroundColor:dayColor+"18" }]}>
                      <Text style={[styles.codeText, { color:dayColor }]}>{item.subjectCode}</Text>
                    </View>
                  ) : null}
                </View>
                {item.room ? (
                  <View style={styles.roomBadge}>
                    <Ionicons name="location-outline" size={11} color="#64748b" />
                    <Text style={styles.roomText}>{item.room}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.slotMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color="#64748b" />
                  <Text style={styles.metaText}>
                    {item.startTime}{item.endTime ? ` — ${item.endTime}` : ""}
                  </Text>
                </View>
                {item.teacherName ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>{item.teacherName}</Text>
                  </View>
                ) : null}
                {item.department ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="school-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>
                      {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]}
                      {item.semester ? ` · Sem ${item.semester}` : ""}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.durationBar, { backgroundColor:dayColor }]} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#0f1923" },
  loaderContainer: { flex:1, justifyContent:"center", alignItems:"center", backgroundColor:"#0f1923" },
  header:          { flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:16, paddingTop:55, paddingBottom:16 },
  menuBtn:         { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:    { flex:1, alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:18, fontWeight:"700" },
  headerSub:       { color:"#64748b", fontSize:11, marginTop:2 },
  todayBanner:     { flexDirection:"row", alignItems:"center", gap:8, marginHorizontal:16, marginTop:12, padding:12, borderRadius:12, borderWidth:1 },
  todayText:       { fontSize:12, fontWeight:"600" },
  tabsScroll:      { marginTop:12 },
  tabs:            { paddingHorizontal:16, gap:8, paddingBottom:4 },
  tab:             { paddingHorizontal:14, paddingVertical:8, borderRadius:12, alignItems:"center", backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", flexDirection:"row", gap:6 },
  tabDay:          { color:"#cfd5de", fontSize:11, fontWeight:"700" },
  tabBadge:        { width:18, height:18, borderRadius:9, justifyContent:"center", alignItems:"center" },
  tabBadgeText:    { fontSize:10, fontWeight:"800" },
  list:            { padding:16, paddingBottom:30 },
  slotRow:         { flexDirection:"row", marginBottom:16 },
  timeline:        { width:24, alignItems:"center" },
  timelineDot:     { width:12, height:12, borderRadius:6, marginTop:16 },
  timelineLine:    { width:2, flex:1, backgroundColor:"rgba(255,255,255,0.06)", marginTop:4 },
  slotCard:        { flex:1, marginLeft:12, backgroundColor:"#1a2535", borderRadius:16, padding:16, overflow:"hidden" },
  slotHeader:      { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 },
  slotSubject:     { color:"#fff", fontSize:15, fontWeight:"700" },
  codeBadge:       { alignSelf:"flex-start", paddingHorizontal:8, paddingVertical:2, borderRadius:6, marginTop:4 },
  codeText:        { fontSize:10, fontWeight:"800" },
  roomBadge:       { flexDirection:"row", alignItems:"center", gap:3, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:8, paddingVertical:4, borderRadius:8,marginTop:4 },
  roomText:        { color:"#64748b", fontSize:11 },
  slotMeta:        { gap:6 },
  metaItem:        { flexDirection:"row", alignItems:"center", gap:6 },
  metaText:        { color:"#64748b", fontSize:12 },
  durationBar:     { position:"absolute", left:0, top:0, bottom:0, width:3, borderRadius:2 },
  emptyState:      { alignItems:"center", paddingTop:60, gap:12 },
  emptyTitle:      { color:"#374151", fontSize:17, fontWeight:"700" },
  emptyText:       { color:"#1f2937", fontSize:13 },
});