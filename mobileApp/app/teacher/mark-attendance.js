import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  Alert, ScrollView, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── STEP 1: Today's Classes Card ──
const ClassCard = ({ item, onPress }) => {
  const color = item.color || "#00c6ff";
  return (
    <Pressable style={styles.classCard} onPress={onPress}>
      <View style={[styles.classAccent, { backgroundColor: color }]} />
      <View style={styles.classBody}>
        <View style={styles.classTop}>
          <Text style={styles.classSubject} numberOfLines={1}>
            {item.subjectId?.name || item.subjectName || "Subject"}
          </Text>
          <View style={[styles.classBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.classBadgeText, { color }]}>
              {item.subjectId?.code || item.subjectCode || ""}
            </Text>
          </View>
        </View>
        <View style={styles.classMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color="#64748b" />
            <Text style={styles.metaText}>
              {item.startTime} — {item.endTime}
            </Text>
          </View>
          {item.room && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color="#64748b" />
              <Text style={styles.metaText}>{item.room}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color="#64748b" />
            <Text style={styles.metaText}>
              {item.studentCount || "—"} students
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.classArrow}>
        <Ionicons name="chevron-forward" size={20} color={color} />
      </View>
    </Pressable>
  );
};

// ── STEP 2: Student Row ──
const StudentRow = ({ item, status, onToggle }) => {
  const isPresent = status === "present";
  const isAbsent = status === "absent";

  return (
    <View style={styles.studentRow}>
      <View style={styles.studentLeft}>
        <View style={[styles.studentAvatar, {
          backgroundColor: isPresent ? "rgba(52,211,153,0.15)" :
                           isAbsent  ? "rgba(248,113,113,0.15)" :
                                       "rgba(255,255,255,0.06)"
        }]}>
          <Text style={[styles.studentInitial, {
            color: isPresent ? "#34d399" : isAbsent ? "#f87171" : "#64748b"
          }]}>
            {item.name?.[0]?.toUpperCase() || "S"}
          </Text>
        </View>
        <View>
          <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.studentId}>{item.studentId || item.rollNo || "—"}</Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, isPresent && styles.togglePresent]}
          onPress={() => onToggle(item._id, "present")}
        >
          <Ionicons name="checkmark" size={16} color={isPresent ? "#fff" : "#374151"} />
          {isPresent && <Text style={styles.toggleLabel}>P</Text>}
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, isAbsent && styles.toggleAbsent]}
          onPress={() => onToggle(item._id, "absent")}
        >
          <Ionicons name="close" size={16} color={isAbsent ? "#fff" : "#374151"} />
          {isAbsent && <Text style={styles.toggleLabel}>A</Text>}
        </Pressable>
      </View>
    </View>
  );
};

export default function MarkAttendance() {
  const navigation = useNavigation();

  // STEP: "classes" | "students"
  const [step, setStep] = useState("classes");

  // Step 1 data
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherData, setTeacherData] = useState(null);

  // Step 2 data
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  // attendance = { studentId: "present" | "absent" }
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTodayClasses();
    }, [])
  );

  const loadTodayClasses = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const raw = await AsyncStorage.getItem("teacherData");
      const teacher = raw ? JSON.parse(raw) : null;
      setTeacherData(teacher);

      const todayName = DAYS[new Date().getDay()];

      // Get timetable for this teacher
      const res = await API.get("/timetable/teacher");
      const all = res.data?.timetable || res.data || [];

      // Filter: today's classes for this teacher
      const todays = all
        .filter((t) => t.day === todayName)
        .map((t, i) => ({
          ...t,
          color: ["#00c6ff","#34d399","#f59e0b","#a78bfa","#f87171","#60a5fa"][i % 6],
        }))
        .sort((a, b) => a.startTime?.localeCompare(b.startTime));

      setTodayClasses(todays);

    } catch (e) {
      console.log("Timetable load error:", e.message);
      setTodayClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClassPress = async (classItem) => {
    try {
      setSelectedClass(classItem);
      setStep("students");
      setStudentsLoading(true);
      setSubmitted(false);
      setAttendance({});

      // Get students enrolled in this subject / semester
      const subjectId = classItem.subjectId?._id || classItem.subjectId;
      const res = await API.get(`/students/by-subject/${subjectId}`);
      const list = res.data?.students || res.data || [];
      setStudents(list);

      // Default all to absent
      const defaultAtt = {};
      list.forEach((s) => { defaultAtt[s._id] = "absent"; });
      setAttendance(defaultAtt);

    } catch (e) {
      console.log("Students load error:", e.message);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleAttendance = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  // Mark all present / absent
  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s._id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    const unmarked = students.filter((s) => !attendance[s._id]);
    if (unmarked.length > 0) {
      Alert.alert(
        "Unmarked Students",
        `${unmarked.length} student(s) not marked. Mark them before submitting.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark Absent & Submit", onPress: () => submitAttendance(true) },
        ]
      );
      return;
    }
    submitAttendance(false);
  };

  const submitAttendance = async (markRemainingAbsent = false) => {
    try {
      setSubmitting(true);

      const records = students.map((s) => ({
        studentId: s._id,
        status: attendance[s._id] || (markRemainingAbsent ? "absent" : "absent"),
      }));

      await API.post("/attendance/mark", {
        subjectId: selectedClass.subjectId?._id || selectedClass.subjectId,
        timetableId: selectedClass._id,
        date: new Date().toISOString().split("T")[0],
        records,
      });

      setSubmitted(true);
      Alert.alert("✅ Done!", "Attendance marked successfully!");

    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendance).filter((v) => v === "present").length;
  const absentCount  = Object.values(attendance).filter((v) => v === "absent").length;
  const unmarkedCount = students.length - presentCount - absentCount;
  const todayName = DAYS[new Date().getDay()];

  // ── STEP 1 VIEW ──
  if (step === "classes") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

        {/* Header */}
        <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
          <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>{todayName}'s Classes</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Today Banner */}
        <View style={styles.todayBanner}>
          <Ionicons name="today" size={16} color="#00c6ff" />
          <Text style={styles.todayText}>
            {todayName}, {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00c6ff" />
          </View>
        ) : (
          <FlatList
            data={todayClasses}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadTodayClasses(true)} tintColor="#00c6ff" />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="cafe-outline" size={40} color="#374151" />
                </View>
                <Text style={styles.emptyTitle}>No Classes Today</Text>
                <Text style={styles.emptyText}>Enjoy your free day! 🎉</Text>
              </View>
            )}
            ListHeaderComponent={() => todayClasses.length > 0 && (
              <View style={styles.classCountBadge}>
                <Text style={styles.classCountText}>
                  {todayClasses.length} {todayClasses.length === 1 ? "class" : "classes"} scheduled
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <ClassCard item={item} onPress={() => handleClassPress(item)} />
            )}
          />
        )}
      </View>
    );
  }

  // ── STEP 2 VIEW ──
  const color = selectedClass?.color || "#00c6ff";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      {/* Header */}
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => { setStep("classes"); setSelectedClass(null); }} style={styles.menuBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedClass?.subjectId?.name || "Attendance"}
          </Text>
          <Text style={styles.headerSub}>
            {selectedClass?.startTime} — {selectedClass?.endTime}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Stats Bar */}
      {!studentsLoading && (
        <View style={styles.statsBar}>
          <View style={[styles.statChip, { backgroundColor: "rgba(52,211,153,0.12)" }]}>
            <Text style={[styles.statChipNum, { color: "#34d399" }]}>{presentCount}</Text>
            <Text style={styles.statChipLabel}>Present</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "rgba(248,113,113,0.12)" }]}>
            <Text style={[styles.statChipNum, { color: "#f87171" }]}>{absentCount}</Text>
            <Text style={styles.statChipLabel}>Absent</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: "rgba(100,116,139,0.12)" }]}>
            <Text style={[styles.statChipNum, { color: "#64748b" }]}>{unmarkedCount}</Text>
            <Text style={styles.statChipLabel}>Unmarked</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: color + "12" }]}>
            <Text style={[styles.statChipNum, { color }]}>{students.length}</Text>
            <Text style={styles.statChipLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* Mark All Buttons */}
      {!studentsLoading && students.length > 0 && !submitted && (
        <View style={styles.markAllRow}>
          <Pressable style={styles.markAllPresent} onPress={() => markAll("present")}>
            <Ionicons name="checkmark-done" size={15} color="#34d399" />
            <Text style={styles.markAllPresentText}>All Present</Text>
          </Pressable>
          <Pressable style={styles.markAllAbsent} onPress={() => markAll("absent")}>
            <Ionicons name="close-circle" size={15} color="#f87171" />
            <Text style={styles.markAllAbsentText}>All Absent</Text>
          </Pressable>
        </View>
      )}

      {studentsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={40} color="#374151" />
              </View>
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptyText}>No students enrolled in this subject</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <StudentRow
              item={item}
              status={attendance[item._id]}
              onToggle={submitted ? () => {} : toggleAttendance}
            />
          )}
          ListFooterComponent={() =>
            students.length > 0 && (
              submitted ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={28} color="#34d399" />
                  <Text style={styles.successText}>Attendance submitted!</Text>
                  <Pressable style={styles.backBtn} onPress={() => { setStep("classes"); setSelectedClass(null); }}>
                    <Text style={styles.backBtnText}>← Back to Classes</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={["#10b981","#059669"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.submitGrad}
                  >
                    {submitting
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                          <Text style={styles.submitText}>Submit Attendance</Text>
                        </>
                    }
                  </LinearGradient>
                </Pressable>
              )
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
  },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  todayBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,198,255,0.08)",
    marginHorizontal: 16, marginTop: 12,
    padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(0,198,255,0.15)",
  },
  todayText: { color: "#00c6ff", fontSize: 13, fontWeight: "600" },

  list: { padding: 16, paddingBottom: 30 },

  classCountBadge: { marginBottom: 12 },
  classCountText: { color: "#374151", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },

  // Class Card
  classCard: {
    backgroundColor: "#1a2535", borderRadius: 16,
    marginBottom: 12, flexDirection: "row", alignItems: "center",
    overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  classAccent: { width: 4, alignSelf: "stretch" },
  classBody: { flex: 1, padding: 14 },
  classTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  classSubject: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  classBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  classBadgeText: { fontSize: 10, fontWeight: "700" },
  classMeta: { gap: 5 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: "#64748b", fontSize: 12 },
  classArrow: { paddingRight: 14 },

  // Stats Bar
  statsBar: {
    flexDirection: "row", justifyContent: "space-around",
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#1a2535", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  statChip: { alignItems: "center", padding: 8, borderRadius: 10, minWidth: 60 },
  statChipNum: { fontSize: 20, fontWeight: "800" },
  statChipLabel: { color: "#64748b", fontSize: 10, marginTop: 2, fontWeight: "600" },

  // Mark All
  markAllRow: {
    flexDirection: "row", gap: 10,
    marginHorizontal: 16, marginTop: 12,
  },
  markAllPresent: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.1)",
    borderWidth: 1, borderColor: "rgba(52,211,153,0.2)",
  },
  markAllPresentText: { color: "#34d399", fontSize: 13, fontWeight: "700" },
  markAllAbsent: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)",
  },
  markAllAbsentText: { color: "#f87171", fontSize: 13, fontWeight: "700" },

  // Student Row
  studentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#1a2535", borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  studentLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  studentAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  studentInitial: { fontSize: 16, fontWeight: "800" },
  studentName: { color: "#fff", fontSize: 14, fontWeight: "600", maxWidth: width * 0.45 },
  studentId: { color: "#64748b", fontSize: 11, marginTop: 2 },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row", gap: 2,
  },
  togglePresent: { backgroundColor: "#34d399", borderColor: "#34d399" },
  toggleAbsent:  { backgroundColor: "#f87171", borderColor: "#f87171" },
  toggleLabel: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Submit
  submitBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden" },
  submitGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Success
  successBox: { alignItems: "center", padding: 24, gap: 10, marginTop: 16 },
  successText: { color: "#34d399", fontSize: 16, fontWeight: "700" },
  backBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" },
  backBtnText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 17, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13 },
});