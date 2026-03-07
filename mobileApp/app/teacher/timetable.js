import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, ActivityIndicator, RefreshControl,
  Dimensions, BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };
const DAY_COLORS = {
  Monday: "#00c6ff", Tuesday: "#a78bfa", Wednesday: "#34d399",
  Thursday: "#f59e0b", Friday: "#f87171", Saturday: "#fb923c",
};

const SUBJECT_COLORS = ["#00c6ff", "#a78bfa", "#34d399", "#f59e0b", "#f87171", "#fb923c", "#60a5fa", "#34d399"];

// ── Time Slot Card ──
const SlotCard = ({ slot, color }) => (
  <View style={[styles.slotCard, { borderLeftColor: color }]}>
    <View style={[styles.slotTimeBox, { backgroundColor: color + "18" }]}>
      <Ionicons name="time-outline" size={12} color={color} />
      <Text style={[styles.slotTime, { color }]}>{slot.startTime}</Text>
      <Text style={styles.slotTimeSep}>—</Text>
      <Text style={[styles.slotTime, { color }]}>{slot.endTime}</Text>
    </View>
    <View style={styles.slotBody}>
      <Text style={styles.slotSubject} numberOfLines={1}>
        {slot.subjectId?.name || slot.subjectName || "Subject"}
      </Text>
      {(slot.subjectId?.code || slot.subjectCode) && (
        <View style={[styles.slotCodeBadge, { backgroundColor: color + "15" }]}>
          <Text style={[styles.slotCodeText, { color }]}>
            {slot.subjectId?.code || slot.subjectCode}
          </Text>
        </View>
      )}
      {slot.room && (
        <View style={styles.slotRoomRow}>
          <Ionicons name="location-outline" size={11} color="#64748b" />
          <Text style={styles.slotRoom}>Room {slot.room}</Text>
        </View>
      )}
      {slot.department && (
        <View style={styles.slotDeptRow}>
          <Ionicons name="people-outline" size={11} color="#64748b" />
          <Text style={styles.slotDept} numberOfLines={1}>
            {slot.department?.match(/\(([^)]+)\)/)?.[1] || slot.department?.split(" ")[0]}
            {slot.admissionYear ? ` · ${slot.admissionYear}` : ""}
            {slot.semester ? ` · Sem ${slot.semester}` : ""}
          </Text>
        </View>
      )}
    </View>
    {slot.slotNumber && (
      <View style={styles.slotNumBadge}>
        <Text style={styles.slotNumText}>#{slot.slotNumber}</Text>
      </View>
    )}
  </View>
);

// ── Day Section ──
const DaySection = ({ day, slots, colorMap }) => {
  const color = DAY_COLORS[day] || "#64748b";
  if (!slots?.length) return null;
  return (
    <View style={styles.daySection}>
      <View style={styles.daySectionHeader}>
        <LinearGradient
          colors={[color + "22", color + "08"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.dayHeaderGrad}
        >
          <View style={[styles.dayDot, { backgroundColor: color }]} />
          <Text style={[styles.dayName, { color }]}>{day}</Text>
          <View style={[styles.dayCountBadge, { backgroundColor: color + "25" }]}>
            <Text style={[styles.dayCount, { color }]}>{slots.length}</Text>
          </View>
        </LinearGradient>
      </View>
      {slots.map((slot, i) => (
        <SlotCard key={slot._id || i} slot={slot} color={colorMap[slot.subjectId?._id || slot.subjectName] || SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
      ))}
    </View>
  );
};

// ══════════════════════════════════════════
export default function TeacherTimetable() {
  const router = useRouter();
  const navigation = useNavigation();

  const [timetable, setTimetable] = useState({});
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDay, setActiveDay] = useState("All");
  const [colorMap, setColorMap] = useState({});

  useFocusEffect(useCallback(() => {
    loadTimetable();
  }, []));

  // Back handler
  useFocusEffect(useCallback(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/teacher/dashboard");
      return true;
    });
    return () => handler.remove();
  }, []));

  const loadTimetable = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/assignments-admin/timetable/my");
      const grouped = res.data?.timetable || {};
      const allSlots = res.data?.slots || [];

      setTimetable(grouped);
      setSlots(allSlots);

      // ── Assign colors to each subject ──
      const map = {};
      let ci = 0;
      allSlots.forEach(s => {
        const key = s.subjectId?._id || s.subjectName;
        if (key && !map[key]) {
          map[key] = SUBJECT_COLORS[ci % SUBJECT_COLORS.length];
          ci++;
        }
      });
      setColorMap(map);

    } catch (e) {
      console.log("Timetable load error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Stats ──
  const totalClasses = slots.length;
  const totalDays = Object.keys(timetable).filter(d => timetable[d]?.length > 0).length;
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todayClasses = timetable[todayName]?.length || 0;

  // ── Filter by day ──
  const filteredDays = activeDay === "All"
    ? DAYS.filter(d => timetable[d]?.length > 0)
    : DAYS.filter(d => d === activeDay && timetable[d]?.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Timetable</Text>
          <Text style={styles.headerSub}>
            {totalClasses} classes · {totalDays} days/week
          </Text>
        </View>
        <Pressable onPress={() => loadTimetable(true)} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color="#a78bfa" />
        </Pressable>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTimetable(true)} tintColor="#a78bfa" />}
        contentContainerStyle={styles.body}
      >
        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#00c6ff" }]}>
            <Text style={[styles.statNum, { color: "#00c6ff" }]}>{totalClasses}</Text>
            <Text style={styles.statLabel}>Total{"\n"}Classes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#a78bfa" }]}>
            <Text style={[styles.statNum, { color: "#a78bfa" }]}>{totalDays}</Text>
            <Text style={styles.statLabel}>Active{"\n"}Days</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#34d399" }]}>
            <Text style={[styles.statNum, { color: "#34d399" }]}>{todayClasses}</Text>
            <Text style={styles.statLabel}>Today&apos;s{"\n"}Classes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}>
            <Text style={[styles.statNum, { color: "#f59e0b" }]}>
              {Object.keys(colorMap).length}
            </Text>
            <Text style={styles.statLabel}>Subjects{"\n"}Assigned</Text>
          </View>
        </View>

        {/* ── Today Banner ── */}
        {todayClasses > 0 && (
          <Pressable style={styles.todayBanner} onPress={() => setActiveDay(todayName)}>
            <LinearGradient
              colors={["rgba(52,211,153,0.15)", "rgba(52,211,153,0.05)"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.todayBannerGrad}
            >
              <View style={styles.todayLeft}>
                <View style={styles.todayDot} />
                <View>
                  <Text style={styles.todayLabel}>TODAY — {todayName.toUpperCase()}</Text>
                  <Text style={styles.todayCount}>{todayClasses} class{todayClasses > 1 ? "es" : ""} scheduled</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#34d399" />
            </LinearGradient>
          </Pressable>
        )}

        {/* ── Day Filter Chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.dayFilters} contentContainerStyle={{ gap: 8 }}>
          <Pressable
            style={[styles.dayChip, activeDay === "All" && styles.dayChipActive]}
            onPress={() => setActiveDay("All")}
          >
            <Text style={[styles.dayChipText, activeDay === "All" && { color: "#fff" }]}>All Days</Text>
          </Pressable>
          {DAYS.map(day => {
            const count = timetable[day]?.length || 0;
            const color = DAY_COLORS[day];
            const isActive = activeDay === day;
            return (
              <Pressable key={day}
                style={[styles.dayChip, isActive && { backgroundColor: color + "22", borderColor: color + "55" }]}
                onPress={() => setActiveDay(day)}
              >
                <Text style={[styles.dayChipText, isActive && { color }]}>{DAY_SHORT[day]}</Text>
                {count > 0 && (
                  <View style={[styles.dayChipBadge, { backgroundColor: isActive ? color : "#374151" }]}>
                    <Text style={styles.dayChipBadgeText}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Timetable Content ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#a78bfa" />
            <Text style={styles.loadingText}>Loading your timetable...</Text>
          </View>
        ) : filteredDays.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={44} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeDay === "All" ? "No Classes Scheduled" : `No Classes on ${activeDay}`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeDay === "All"
                ? "Admin will assign subjects and schedule your classes"
                : "You have a free day!"}
            </Text>
          </View>
        ) : (
          filteredDays.map(day => (
            <DaySection
              key={day}
              day={day}
              slots={timetable[day] || []}
              colorMap={colorMap}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { alignItems: "center", paddingTop: 60, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.1)", justifyContent: "center", alignItems: "center" },

  body: { padding: 16 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: "#1a2535", borderRadius: 12, padding: 10, borderLeftWidth: 3, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 9, marginTop: 2, fontWeight: "600", textAlign: "center" },

  todayBanner: { borderRadius: 14, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  todayBannerGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  todayLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  todayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#34d399" },
  todayLabel: { color: "#34d399", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  todayCount: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },

  dayFilters: { marginBottom: 16 },

  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 6 },
  dayChipActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  dayChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  dayChipBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  dayChipBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  daySection: { marginBottom: 20 },
  daySectionHeader: { marginBottom: 10, borderRadius: 12, overflow: "hidden" },
  dayHeaderGrad: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayName: { fontSize: 14, fontWeight: "800", flex: 1 },
  dayCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dayCount: { fontSize: 11, fontWeight: "800" },

  slotCard: { flexDirection: "row", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", borderLeftWidth: 3, overflow: "hidden" },
  slotTimeBox: { padding: 12, alignItems: "center", justifyContent: "center", minWidth: 68, gap: 2 },
  slotTime: { fontSize: 11, fontWeight: "800" },
  slotTimeSep: { color: "#374151", fontSize: 10 },
  slotBody: { flex: 1, padding: 12, paddingLeft: 8 },
  slotSubject: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  slotCodeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginBottom: 4 },
  slotCodeText: { fontSize: 10, fontWeight: "700" },
  slotRoomRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  slotRoom: { color: "#64748b", fontSize: 11 },
  slotDeptRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  slotDept: { color: "#64748b", fontSize: 11, flex: 1 },
  slotNumBadge: { padding: 8, justifyContent: "center" },
  slotNumText: { color: "#374151", fontSize: 9, fontWeight: "700" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 14 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySubtitle: { color: "#1f2937", fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  loadingText: { color: "#374151", fontSize: 13 },
});