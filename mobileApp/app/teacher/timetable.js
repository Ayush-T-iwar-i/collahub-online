// app/teacher/timetable.js
// Teachers can only view admin-assigned timetables.
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = {
  Monday: "#00c6ff", Tuesday: "#a78bfa", Wednesday: "#34d399",
  Thursday: "#fbbf24", Friday: "#f87171", Saturday: "#fb923c",
};

export default function Timetable() {
  const navigation = useNavigation();
  const [schedule, setSchedule] = useState({});
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay() - 1] || "Monday"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadTimetable(); }, []));

  // ✅ Only SubjectRequest based — admin assigned timetable
  const loadTimetable = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await API.get("/subject-requests/teacher-timetable");
      setSchedule(res.data?.timetable || {});
    } catch (err) {
      console.log("Timetable load error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const daySlots = schedule[selectedDay] || [];
  const dayColor = DAY_COLORS[selectedDay] || "#00c6ff";

  // Total classes today
  const todayName = DAYS[new Date().getDay() - 1] || "Monday";
  const totalToday = (schedule[todayName] || []).length;
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
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Timetable</Text>
          <Text style={styles.headerSub}>Admin assigned schedule</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#00c6ff" }]}>{totalSlots}</Text>
          <Text style={styles.statLabel}>Total Classes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#34d399" }]}>{totalToday}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#a78bfa" }]}>
            {DAYS.filter(d => (schedule[d] || []).length > 0).length}
          </Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>
      </View>

      {/* TODAY BANNER */}
      <View style={[styles.todayBanner, { backgroundColor: dayColor + "18", borderColor: dayColor + "33" }]}>
        <Ionicons name="today-outline" size={16} color={dayColor} />
        <Text style={[styles.todayText, { color: dayColor }]}>
          {selectedDay} — {daySlots.length} {daySlots.length === 1 ? "class" : "classes"}
        </Text>
        {/* ✅ No assign button — admin assigns timetable */}
        <View style={[styles.adminBadge]}>
          <Ionicons name="shield-checkmark" size={11} color="#34d399" />
          <Text style={styles.adminBadgeText}>Admin Assigned</Text>
        </View>
      </View>

      {/* DAY TABS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {DAYS.map(day => {
          const isActive = day === selectedDay;
          const color = DAY_COLORS[day];
          const count = (schedule[day] || []).length;
          const isToday = day === todayName;
          return (
            <Pressable key={day} onPress={() => setSelectedDay(day)}
              style={[
                styles.tab,
                isActive && { backgroundColor: color, borderColor: color },
                isToday && !isActive && { borderColor: color + "55" },
              ]}>
              <Text style={[styles.tabDay, isActive && { color: "#fff" }]}>
                {day.slice(0, 3)}{isToday ? " •" : ""}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.tabBadge,
                  { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : color + "33" }
                ]}>
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
        keyExtractor={(item, i) => item._id?.toString() || i.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTimetable(true)}
            tintColor="#00c6ff"
          />
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
            <View style={styles.emptyNote}>
              <Ionicons name="information-circle-outline" size={14} color="#374151" />
              <Text style={styles.emptyNoteText}>
                Timetable is assigned by admin when your subject request is approved.
              </Text>
            </View>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View style={styles.slotRow}>
            {/* Timeline */}
            <View style={styles.timeline}>
              <View style={[styles.timelineDot, { backgroundColor: dayColor }]} />
              {index < daySlots.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Card */}
            <View style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotSubject} numberOfLines={1}>
                    {item.subjectName}
                  </Text>
                  {item.subjectCode ? (
                    <View style={[styles.codeTag, { backgroundColor: dayColor + "18" }]}>
                      <Text style={[styles.codeText, { color: dayColor }]}>{item.subjectCode}</Text>
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
                {item.department && (
                  <View style={styles.metaItem}>
                    <Ionicons name="school-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>
                      {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]}
                      {item.semester ? ` · Sem ${item.semester}` : ""}
                      {item.section && item.section !== "All" ? ` · Sec ${item.section}` : ""}
                    </Text>
                  </View>
                )}
                {item.admissionYear && (
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color="#64748b" />
                    <Text style={styles.metaText}>Batch {item.admissionYear}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.durationBar, { backgroundColor: dayColor }]} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 55, paddingBottom: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  statsStrip: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 8, backgroundColor: "#1a2535", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 10, marginTop: 2, fontWeight: "600" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.08)" },

  todayBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  todayText: { fontSize: 13, fontWeight: "600", flex: 1 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  adminBadgeText: { color: "#34d399", fontSize: 9, fontWeight: "700" },

  tabsScroll: { marginTop: 10 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: "center", backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", gap: 6 },
  tabDay: { color: "#64748b", fontSize: 13, fontWeight: "700" },
  tabBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  tabBadgeText: { fontSize: 10, fontWeight: "800" },

  list: { padding: 16, paddingBottom: 30 },
  slotRow: { flexDirection: "row", marginBottom: 16 },
  timeline: { width: 24, alignItems: "center" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 16 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "rgba(255,255,255,0.06)", marginTop: 4 },

  slotCard: { flex: 1, marginLeft: 12, backgroundColor: "#1a2535", borderRadius: 16, padding: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  slotHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  slotSubject: { color: "#fff", fontSize: 15, fontWeight: "700" },
  codeTag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  codeText: { fontSize: 10, fontWeight: "800" },
  roomBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roomText: { color: "#64748b", fontSize: 11 },
  slotMeta: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#64748b", fontSize: 12 },
  durationBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyTitle: { color: "#374151", fontSize: 17, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13, textAlign: "center" },
  emptyNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", marginTop: 8 },
  emptyNoteText: { color: "#374151", fontSize: 11, flex: 1, lineHeight: 16 },
});