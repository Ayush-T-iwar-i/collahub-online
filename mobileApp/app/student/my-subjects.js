import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, ScrollView,
  RefreshControl, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };
const DAY_COLORS = {
  Monday: "#00c6ff", Tuesday: "#a78bfa", Wednesday: "#34d399",
  Thursday: "#f59e0b", Friday: "#f87171", Saturday: "#fb923c",
};
const SEM_COLORS = ["#00c6ff", "#34d399", "#a78bfa", "#f59e0b", "#f87171", "#60a5fa", "#fb923c", "#e879f9"];
const TYPE_COLORS = { Theory: "#00c6ff", Lab: "#f59e0b", Both: "#a78bfa" };

// ─────────────────────────────────────────────────
// Subject Card — for "My Subjects" tab
// ─────────────────────────────────────────────────
const SubjectCard = ({ item }) => {
  const semColor = SEM_COLORS[(Number(item.semester) - 1) % SEM_COLORS.length];
  const typeColor = TYPE_COLORS[item.type] || "#64748b";
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";

  return (
    <View style={styles.subCard}>
      <View style={[styles.subIconWrap, { backgroundColor: semColor + "18" }]}>
        <Ionicons name="book" size={22} color={semColor} />
      </View>
      <View style={styles.subInfo}>
        <Text style={styles.subName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.subBadgeRow}>
          {item.code && (
            <View style={[styles.codeBadge, { backgroundColor: semColor + "18" }]}>
              <Text style={[styles.codeBadgeText, { color: semColor }]}>{item.code}</Text>
            </View>
          )}
          <View style={[styles.semBadge, { backgroundColor: semColor + "18" }]}>
            <Text style={[styles.semBadgeText, { color: semColor }]}>Sem {item.semester}</Text>
          </View>
          {item.type && (
            <View style={[styles.typeBadge, { backgroundColor: typeColor + "18" }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.type}</Text>
            </View>
          )}
        </View>
        <View style={styles.subMetaRow}>
          <Ionicons name="business-outline" size={10} color="#64748b" />
          <Text style={styles.subMetaText}>{deptShort}</Text>
          {item.credits > 0 && (
            <>
              <Text style={styles.subDot}>·</Text>
              <Ionicons name="star-outline" size={10} color="#a78bfa" />
              <Text style={[styles.subMetaText, { color: "#a78bfa" }]}>{item.credits} cr</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────
// Timetable Slot Card
// ─────────────────────────────────────────────────
const SlotCard = ({ slot }) => {
  const color = DAY_COLORS[slot.day] || "#64748b";
  const deptShort = slot.department?.match(/\(([^)]+)\)/)?.[1] || slot.department?.split(" ")[0] || "";

  return (
    <View style={[styles.slotCard, { borderLeftColor: color }]}>
      {/* Time Box */}
      <View style={[styles.slotTimeBox, { backgroundColor: color + "12" }]}>
        <Ionicons name="time-outline" size={11} color={color} />
        <Text style={[styles.slotTimeStart, { color }]}>{slot.startTime}</Text>
        <Text style={styles.slotTimeDash}>—</Text>
        <Text style={[styles.slotTimeEnd, { color }]}>{slot.endTime}</Text>
      </View>

      {/* Info */}
      <View style={styles.slotBody}>
        <Text style={styles.slotSubject} numberOfLines={1}>{slot.subjectName}</Text>
        {slot.subjectCode && (
          <View style={[styles.slotCodeBadge, { backgroundColor: color + "18" }]}>
            <Text style={[styles.slotCodeText, { color }]}>{slot.subjectCode}</Text>
          </View>
        )}

        {/* Teacher */}
        <View style={styles.slotTeacherRow}>
          <Ionicons name="person-outline" size={11} color="#f59e0b" />
          <Text style={styles.slotTeacherName}>{slot.teacherName || "Teacher"}</Text>
        </View>

        {/* Room + Dept */}
        <View style={styles.slotMetaRow}>
          {slot.room ? (
            <View style={styles.slotMetaChip}>
              <Ionicons name="location-outline" size={10} color="#64748b" />
              <Text style={styles.slotMetaText}>Room {slot.room}</Text>
            </View>
          ) : null}
          {deptShort ? (
            <View style={styles.slotMetaChip}>
              <Ionicons name="people-outline" size={10} color="#64748b" />
              <Text style={styles.slotMetaText}>{deptShort}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Slot number */}
      {slot.slotNumber && (
        <Text style={styles.slotNum}>#{slot.slotNumber}</Text>
      )}
    </View>
  );
};


// Day Section in Timetable
// ─────────────────────────────────────────────────
const DaySection = ({ day, slots }) => {
  const color = DAY_COLORS[day] || "#64748b";
  if (!slots?.length) return null;

  return (
    <View style={styles.daySection}>
      <LinearGradient
        colors={[color + "25", color + "08"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.dayHeader}>
        <View style={[styles.dayDot, { backgroundColor: color }]} />
        <Text style={[styles.dayName, { color }]}>{day}</Text>
        <View style={[styles.dayCountBadge, { backgroundColor: color + "25" }]}>
          <Text style={[styles.dayCount, { color }]}>{slots.length} class{slots.length > 1 ? "es" : ""}</Text>
        </View>
      </LinearGradient>

      {slots.map((slot, i) => (
        <SlotCard key={slot._id || i} slot={slot} />
      ))}
    </View>
  );
};


// MAIN SCREEN
// ═══════════════════════════════════════════════
export default function StudentMySubjects() {
  const router = useRouter();

  const [tab, setTab] = useState("subjects");
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [allSlots, setAllSlots] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDay, setActiveDay] = useState("All");

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [subRes, ttRes] = await Promise.all([
        API.get("/subjects/for-student"),
        API.get("/teacher-schedule/for-student").catch(() => ({ data: { timetable: {}, slots: [] } })),
      ]);

      setSubjects(subRes.data?.subjects || []);
      setStudentInfo(subRes.data?.student || null);

      const tt = ttRes.data?.timetable || {};
      const slots = ttRes.data?.slots || [];
      setTimetable(tt);
      setAllSlots(slots);

    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Stats
  const totalClasses = allSlots.length;
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todayClasses = timetable[todayName]?.length || 0;
  const activeDays = DAYS.filter(d => timetable[d]?.length > 0).length;

  // Filtered days for timetable view
  const filteredDays = activeDay === "All"
    ? DAYS.filter(d => timetable[d]?.length > 0)
    : DAYS.filter(d => d === activeDay && timetable[d]?.length > 0);

  // Today's upcoming class
  const todaySlots = (timetable[todayName] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nextClass = todaySlots.find(s => {
    const [h, m] = s.startTime.split(":").map(Number);
    const now = new Date();
    return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Subjects</Text>
          {studentInfo && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {studentInfo.college} · Sem {studentInfo.semester}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, tab === "subjects" && styles.tabActive]} onPress={() => setTab("subjects")}>
          <Ionicons name="book-outline" size={14} color={tab === "subjects" ? "#00c6ff" : "#64748b"} />
          <Text style={[styles.tabText, tab === "subjects" && { color: "#00c6ff" }]}>
            Subjects ({subjects.length})
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "timetable" && styles.tabActive]} onPress={() => setTab("timetable")}>
          <Ionicons name="calendar-outline" size={14} color={tab === "timetable" ? "#a78bfa" : "#64748b"} />
          <Text style={[styles.tabText, tab === "timetable" && { color: "#a78bfa" }]}>
            Timetable ({totalClasses})
          </Text>
          {todayClasses > 0 && (
            <View style={styles.tabDot}>
              <Text style={styles.tabDotText}>{todayClasses}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
      ) : (
        <>
          {/* ═══ SUBJECTS TAB ═══ */}
          {tab === "subjects" && (
            <FlatList
              data={subjects}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#00c6ff" />}
              ListHeaderComponent={() =>
                studentInfo ? (
                  <View style={styles.studentInfoBanner}>
                    <Ionicons name="school-outline" size={14} color="#00c6ff" />
                    <Text style={styles.studentInfoText} numberOfLines={1}>
                      <Text style={{ color: "#00c6ff", fontWeight: "700" }}>
                        {studentInfo.department?.match(/\(([^)]+)\)/)?.[1] || studentInfo.department?.split(" ")[0]}
                      </Text>
                      {" · "}Semester {studentInfo.semester}
                      {" · "}{studentInfo.college}
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="book-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>No Subjects Yet</Text>
                  <Text style={styles.emptySub}>
                    Admin ne abhi tumhare college, department aur semester ke liye subjects add nahi kiye.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => <SubjectCard item={item} />}
            />
          )}

          {/* ═══ TIMETABLE TAB ═══ */}
          {tab === "timetable" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#a78bfa" />}
              contentContainerStyle={styles.ttBody}>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderLeftColor: "#00c6ff" }]}>
                  <Text style={[styles.statNum, { color: "#00c6ff" }]}>{totalClasses}</Text>
                  <Text style={styles.statLabel}>Total{"\n"}Classes</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: "#a78bfa" }]}>
                  <Text style={[styles.statNum, { color: "#a78bfa" }]}>{activeDays}</Text>
                  <Text style={styles.statLabel}>Active{"\n"}Days</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: "#34d399" }]}>
                  <Text style={[styles.statNum, { color: "#34d399" }]}>{todayClasses}</Text>
                  <Text style={styles.statLabel}>Today&apos;s{"\n"}Classes</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: "#f59e0b" }]}>
                  <Text style={[styles.statNum, { color: "#f59e0b" }]}>{subjects.length}</Text>
                  <Text style={styles.statLabel}>Total{"\n"}Subjects</Text>
                </View>
              </View>

              {/* Today's Next Class Banner */}
              {nextClass && (
                <View style={styles.nextClassBanner}>
                  <LinearGradient
                    colors={["rgba(52,211,153,0.18)", "rgba(52,211,153,0.05)"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.nextClassGrad}>
                    <View style={styles.nextClassLeft}>
                      <View style={styles.nextClassDot} />
                      <View>
                        <Text style={styles.nextClassLabel}>NEXT CLASS TODAY</Text>
                        <Text style={styles.nextClassName}>{nextClass.subjectName}</Text>
                        <Text style={styles.nextClassTime}>
                          {nextClass.startTime} — {nextClass.endTime}
                          {nextClass.room ? `  ·  Room ${nextClass.room}` : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.nextClassTeacher}>
                      <Ionicons name="person-circle-outline" size={28} color="#34d399" />
                      <Text style={styles.nextClassTeacherName} numberOfLines={1}>{nextClass.teacherName}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}

              {/* Day Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.dayFilters} contentContainerStyle={{ gap: 8 }}>
                <Pressable
                  style={[styles.dayChip, activeDay === "All" && styles.dayChipActiveAll]}
                  onPress={() => setActiveDay("All")}>
                  <Text style={[styles.dayChipText, activeDay === "All" && { color: "#fff" }]}>All Days</Text>
                </Pressable>
                {DAYS.map(day => {
                  const count = timetable[day]?.length || 0;
                  const color = DAY_COLORS[day];
                  const isActive = activeDay === day;
                  const isToday = day === todayName;
                  return (
                    <Pressable key={day}
                      style={[
                        styles.dayChip,
                        isActive && { backgroundColor: color + "22", borderColor: color + "55" },
                        isToday && !isActive && { borderColor: "rgba(255,255,255,0.15)" },
                      ]}
                      onPress={() => setActiveDay(day)}>
                      <Text style={[styles.dayChipText, isActive && { color }]}>
                        {DAY_SHORT[day]}
                        {isToday ? " •" : ""}
                      </Text>
                      {count > 0 && (
                        <View style={[styles.dayChipBadge, { backgroundColor: isActive ? color : "#374151" }]}>
                          <Text style={styles.dayChipBadgeText}>{count}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Timetable Content */}
              {filteredDays.length === 0 ? (
                <View style={styles.emptyTT}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="calendar-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {activeDay === "All" ? "No Classes Scheduled" : `No Classes on ${activeDay}`}
                  </Text>
                  <Text style={styles.emptySub}>
                    {activeDay === "All"
                      ? "Teachers haven't set their schedules yet. Please wait!"
                      : "There are no classes on this day. 🎉"
                    }
                  </Text>
                </View>
              ) : (
                filteredDays.map(day => (
                  <DaySection
                    key={day}
                    day={day}
                    slots={(timetable[day] || []).sort((a, b) => a.startTime.localeCompare(b.startTime))}
                  />
                ))
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}


// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#a78bfa" },
  tabText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  tabDot: { backgroundColor: "#34d399", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  tabDotText: { color: "#000", fontSize: 9, fontWeight: "800" },

  list: { padding: 16, paddingBottom: 30 },
  studentInfoBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.08)", padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.18)", marginBottom: 14 },
  studentInfoText: { flex: 1, color: "#94a3b8", fontSize: 11 },

  // Subject card
  subCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 10 },
  subIconWrap: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  subInfo: { flex: 1 },
  subName: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 5 },
  subBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 5 },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeBadgeText: { fontSize: 10, fontWeight: "800" },
  semBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  semBadgeText: { fontSize: 10, fontWeight: "700" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  subMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  subMetaText: { color: "#64748b", fontSize: 10 },
  subDot: { color: "#374151", fontSize: 10 },

  // Timetable tab
  ttBody: { padding: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: "#1a2535", borderRadius: 12, padding: 10, borderLeftWidth: 3, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 9, marginTop: 2, fontWeight: "600", textAlign: "center" },

  nextClassBanner: { borderRadius: 14, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  nextClassGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 10 },
  nextClassLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  nextClassDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#34d399" },
  nextClassLabel: { color: "#34d399", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  nextClassName: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  nextClassTime: { color: "#64748b", fontSize: 11, marginTop: 2 },
  nextClassTeacher: { alignItems: "center", gap: 3 },
  nextClassTeacherName: { color: "#34d399", fontSize: 10, fontWeight: "700", maxWidth: 70, textAlign: "center" },

  dayFilters: { marginBottom: 14 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 5 },
  dayChipActiveAll: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" },
  dayChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  dayChipBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  dayChipBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  daySection: { marginBottom: 20 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 10 },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayName: { fontSize: 14, fontWeight: "800", flex: 1 },
  dayCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  dayCount: { fontSize: 11, fontWeight: "700" },

  slotCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderLeftWidth: 3, overflow: "hidden" },
  slotTimeBox: { padding: 12, alignItems: "center", justifyContent: "center", minWidth: 64, gap: 1 },
  slotTimeStart: { fontSize: 12, fontWeight: "800" },
  slotTimeDash: { color: "#374151", fontSize: 10 },
  slotTimeEnd: { fontSize: 11, fontWeight: "600" },
  slotBody: { flex: 1, padding: 12, paddingLeft: 8 },
  slotSubject: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 4 },
  slotCodeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginBottom: 5 },
  slotCodeText: { fontSize: 10, fontWeight: "700" },
  slotTeacherRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  slotTeacherName: { color: "#f59e0b", fontSize: 12, fontWeight: "600" },
  slotMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slotMetaChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  slotMetaText: { color: "#64748b", fontSize: 10 },
  slotNum: { color: "#374151", fontSize: 9, paddingRight: 10, fontWeight: "700" },

  empty: { alignItems: "center", paddingTop: 70, gap: 12, paddingHorizontal: 20 },
  emptyTT: { alignItems: "center", paddingTop: 50, gap: 12, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12, textAlign: "center", lineHeight: 18 },
});