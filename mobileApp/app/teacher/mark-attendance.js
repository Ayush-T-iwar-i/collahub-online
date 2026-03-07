import React, { useState, useEffect, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, ScrollView,
  Modal, TextInput, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = [
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
];

export default function MarkAttendance() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const subjectRequestId = params?.subjectRequestId;

  // ── States ──
  const [screen, setScreen] = useState("subjects"); // subjects | attendance
  const [mySubjects, setMySubjects] = useState([]);
  const [selSubject, setSelSubject] = useState(null);

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [day, setDay] = useState(
    DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  );
  const [time, setTime] = useState("9:00 AM");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [dayModal, setDayModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);

  // ── Load subjects on mount ──
  useEffect(() => {
    loadSubjects();
  }, []);

  // ── Agar direct subjectRequestId aaya (dashboard se) ──
  useEffect(() => {
    if (subjectRequestId && subjectRequestId !== "undefined" && mySubjects.length > 0) {
      const found = mySubjects.find(s => s._id === subjectRequestId);
      if (found) openSubject(found);
    }
  }, [subjectRequestId, mySubjects]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await API.get("/subject-requests/my-subjects");
      setMySubjects(res.data?.subjects || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load subjects");
    } finally {
      setLoading(false);
    }
  };

  const openSubject = async (subject) => {
    try {
      setSelSubject(subject);
      setLoading(true);
      setScreen("attendance");
      const res = await API.get(`/subject-requests/${subject._id}/students`);
      const studs = res.data?.students || [];
      setStudents(studs);
      // ✅ Default sab present
      const init = {};
      studs.forEach(s => { init[s._id] = "present"; });
      setAttendance(init);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load students");
      setScreen("subjects");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === "present" ? "absent" : "present",
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(s => { updated[s._id] = status; });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    const records = students.map(s => ({
      studentId: s._id,
      status: attendance[s._id] || "absent",
    }));
    const presentCount = records.filter(r => r.status === "present").length;
    const absentCount = records.filter(r => r.status === "absent").length;

    Alert.alert(
      "Confirm Attendance ✅",
      `📚 ${selSubject?.subjectName}\n` +
      `📅 ${day}, ${date}\n` +
      `🕐 ${time}\n\n` +
      `✅ Present: ${presentCount}\n` +
      `❌ Absent:  ${absentCount}\n` +
      `👥 Total:   ${students.length}\n\n` +
      `Submit karoge?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit ✅",
          onPress: async () => {
            try {
              setSaving(true);
              await API.post("/attendance/mark", {
                subjectId: selSubject._id,
                date,
                day,
                time,
                records,
              });
              Alert.alert(
                "Done! 🎉",
                `Attendance submit ho gayi!\n\n✅ Present: ${presentCount}\n❌ Absent: ${absentCount}`,
                [{ text: "OK", onPress: () => setScreen("subjects") }]
              );
            } catch (e) {
              Alert.alert("Error", e.response?.data?.message || "Could not save");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const present = Object.values(attendance).filter(v => v === "present").length;
  const absent = Object.values(attendance).filter(v => v === "absent").length;

  // ═══════════════════════════════════��════
  // SCREEN 1 — Subject Select
  // ════════════════════════════════════════
  if (screen === "subjects") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#080d17" />
        <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>Select a subject</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
        ) : (
          <FlatList
            data={mySubjects}
            keyExtractor={i => i._id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#374151" />
                <Text style={styles.emptyTitle}>No Accepted Subjects</Text>
                <Text style={styles.emptySub}>Admin se subject request accept karwao</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0];
              return (
                <Pressable style={styles.subjectCard} onPress={() => openSubject(item)}>
                  <LinearGradient
                    colors={["rgba(0,198,255,0.08)", "rgba(0,198,255,0.02)"]}
                    style={styles.subjectCardGrad}
                  >
                    <View style={styles.subjectIconWrap}>
                      <Ionicons name="book" size={22} color="#00c6ff" />
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName} numberOfLines={1}>{item.subjectName}</Text>
                      <Text style={styles.subjectCode}>{item.subjectCode || "—"}</Text>
                      <View style={styles.subjectMetaRow}>
                        <View style={styles.metaChip}>
                          <Ionicons name="layers-outline" size={10} color="#64748b" />
                          <Text style={styles.metaChipText}>Sem {item.semester}</Text>
                        </View>
                        {item.section !== "All" && (
                          <View style={styles.metaChip}>
                            <Ionicons name="people-outline" size={10} color="#64748b" />
                            <Text style={styles.metaChipText}>Sec {item.section}</Text>
                          </View>
                        )}
                        <View style={styles.metaChip}>
                          <Ionicons name="calendar-outline" size={10} color="#64748b" />
                          <Text style={styles.metaChipText}>{item.admissionYear}</Text>
                        </View>
                      </View>
                      <Text style={styles.subjectDept} numberOfLines={1}>{deptShort}</Text>
                    </View>
                    <View style={styles.subjectArrow}>
                      <Ionicons name="chevron-forward" size={20} color="#00c6ff" />
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ════════════════════════════════════════
  // SCREEN 2 — Mark Attendance
  // ════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* ── Header ── */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => setScreen("subjects")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selSubject?.subjectName}
          </Text>
          <Text style={styles.headerSub}>
            Sem {selSubject?.semester}
            {selSubject?.section !== "All" ? ` • Sec ${selSubject?.section}` : ""}
            {" • "}{selSubject?.admissionYear}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* ── Class Info Bar — Date, Day, Time ── */}
      <View style={styles.classInfoBar}>

        {/* Date */}
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={13} color="#00c6ff" />
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{date}</Text>
        </View>

        <View style={styles.infoDivider} />

        {/* Day — Pressable */}
        <Pressable style={styles.infoItem} onPress={() => setDayModal(true)}>
          <Ionicons name="today-outline" size={13} color="#a78bfa" />
          <Text style={styles.infoLabel}>Day</Text>
          <Text style={[styles.infoValue, { color: "#a78bfa" }]}>{day.slice(0, 3)}</Text>
          <Ionicons name="chevron-down" size={10} color="#a78bfa" />
        </Pressable>

        <View style={styles.infoDivider} />

        {/* Time — Pressable */}
        <Pressable style={styles.infoItem} onPress={() => setTimeModal(true)}>
          <Ionicons name="time-outline" size={13} color="#f59e0b" />
          <Text style={styles.infoLabel}>Time</Text>
          <Text style={[styles.infoValue, { color: "#f59e0b" }]}>{time}</Text>
          <Ionicons name="chevron-down" size={10} color="#f59e0b" />
        </Pressable>

      </View>

      {/* ── Stats Bar ── */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#34d399" }]}>{present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#f87171" }]}>{absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#00c6ff" }]}>{students.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: "#f59e0b" }]}>
            {students.length > 0 ? Math.round((present / students.length) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* ── Mark All ── */}
      <View style={styles.markAllRow}>
        <Pressable style={styles.markAllBtn} onPress={() => markAll("present")}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#34d399" />
          <Text style={[styles.markAllText, { color: "#34d399" }]}>All Present</Text>
        </Pressable>
        <Pressable style={styles.markAllBtn} onPress={() => markAll("absent")}>
          <Ionicons name="close-circle-outline" size={16} color="#f87171" />
          <Text style={[styles.markAllText, { color: "#f87171" }]}>All Absent</Text>
        </Pressable>
      </View>

      {/* ── Student List ── */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff" /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptySub}>Same college, dept, sem mein koi student nahi</Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const isPresent = attendance[item._id] === "present";
            const initials = item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
            return (
              <Pressable
                style={[styles.studentCard2, isPresent ? styles.presentCard : styles.absentCard]}
                onPress={() => toggle(item._id)}
              >
                {/* Index */}
                <Text style={styles.studentIndex}>{index + 1}</Text>

                {/* Avatar */}
                <View style={[styles.avatar2, {
                  backgroundColor: isPresent ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"
                }]}>
                  <Text style={[styles.avatarText, { color: isPresent ? "#34d399" : "#f87171" }]}>
                    {initials}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.studentInfo2}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentId}>{item.studentId || "—"}</Text>
                </View>

                {/* Toggle Button */}
                <Pressable
                  style={[styles.toggleBtn, {
                    backgroundColor: isPresent ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                    borderColor: isPresent ? "#34d399" : "#f87171",
                  }]}
                  onPress={() => toggle(item._id)}
                >
                  <Ionicons
                    name={isPresent ? "checkmark-circle" : "close-circle"}
                    size={24}
                    color={isPresent ? "#34d399" : "#f87171"}
                  />
                  <Text style={[styles.toggleBtnText, { color: isPresent ? "#34d399" : "#f87171" }]}>
                    {isPresent ? "Present" : "Absent"}
                  </Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      {/* ── Submit Button ── */}
      {!loading && students.length > 0 && (
        <View style={styles.submitWrap}>
          <Pressable
            style={[styles.submitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGrad}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.submitText}>
                    Send Attendance to {present} Students
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* ── Day Picker Modal ── */}
      <Modal visible={dayModal} transparent animationType="slide" onRequestClose={() => setDayModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDayModal(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Day</Text>
            {DAYS.map(d => (
              <Pressable
                key={d}
                style={[styles.pickerOption, day === d && styles.pickerOptionActive]}
                onPress={() => { setDay(d); setDayModal(false); }}
              >
                <Text style={[styles.pickerOptionText, day === d && { color: "#a78bfa" }]}>{d}</Text>
                {day === d && <Ionicons name="checkmark-circle" size={16} color="#a78bfa" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Time Picker Modal ── */}
      <Modal visible={timeModal} transparent animationType="slide" onRequestClose={() => setTimeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTimeModal(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Time</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TIMES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.pickerOption, time === t && styles.pickerOptionActive2]}
                  onPress={() => { setTime(t); setTimeModal(false); }}
                >
                  <Text style={[styles.pickerOptionText, time === t && { color: "#f59e0b" }]}>{t}</Text>
                  {time === t && <Ionicons name="checkmark-circle" size={16} color="#f59e0b" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  // Class info bar
  classInfoBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", marginHorizontal: 16, marginTop: 10, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  infoItem: { flex: 1, alignItems: "center", gap: 3 },
  infoLabel: { color: "#374151", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  infoValue: { color: "#00c6ff", fontSize: 13, fontWeight: "800" },
  infoDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.06)" },

  // Stats bar
  statsBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#374151", fontSize: 9, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.06)" },

  // Mark all
  markAllRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  markAllBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.04)", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  markAllText: { fontSize: 13, fontWeight: "700" },

  // List
  list: { padding: 16, paddingBottom: 120 },

  // Subject Select Screen
  subjectCard: { borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  subjectCardGrad: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  subjectIconWrap: { width: 50, height: 50, borderRadius: 14, backgroundColor: "rgba(0,198,255,0.12)", justifyContent: "center", alignItems: "center" },
  subjectInfo: { flex: 1 },
  subjectName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  subjectCode: { color: "#64748b", fontSize: 11, marginTop: 2 },
  subjectMetaRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaChipText: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  subjectDept: { color: "#374151", fontSize: 10, marginTop: 4 },
  subjectArrow: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,198,255,0.1)", justifyContent: "center", alignItems: "center" },

  // Student Card
  studentCard2: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, gap: 10 },
  presentCard: { backgroundColor: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.2)" },
  absentCard: { backgroundColor: "rgba(248,113,113,0.05)", borderColor: "rgba(248,113,113,0.2)" },
  studentIndex: { color: "#374151", fontSize: 12, fontWeight: "700", width: 24, textAlign: "center" },
  avatar2: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 15, fontWeight: "800" },
  studentInfo2: { flex: 1 },
  studentName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  studentId: { color: "#64748b", fontSize: 11, marginTop: 2 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  toggleBtnText: { fontSize: 12, fontWeight: "800" },

  // Submit
  submitWrap: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#080d17", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  submitBtn: { borderRadius: 14, overflow: "hidden" },
  submitGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 13, textAlign: "center" },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: height * 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 16 },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  pickerOptionActive: { backgroundColor: "rgba(167,139,250,0.12)", borderWidth: 1, borderColor: "rgba(167,139,250,0.3)" },
  pickerOptionActive2: { backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  pickerOptionText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
});