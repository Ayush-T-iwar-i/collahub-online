import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  Alert, Dimensions, Image, Modal, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect, useLocalSearchParams } from "expo-router";
import API from "../../services/api";

const DEPT_COLORS = {
  CSE: "#00c6ff", ECE: "#a78bfa", ME: "#f59e0b",
  CE: "#34d399", IT: "#f87171", EEE: "#60a5fa",
};
const getColor = (dept = "") => {
  const key = Object.keys(DEPT_COLORS).find(k => dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};

const getLast30Days = () => {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
    const isToday = i === 0;
    // Skip Sundays
    const isSunday = d.getDay() === 0;
    days.push({ iso, label, isToday, isSunday });
  }
  return days;
};
const LAST_30_DAYS = getLast30Days();

// ══════════════════════════════════════════
// Date Picker Modal — GREEN = marked, RED = not marked
// ══════════════════════════════════════════
const DatePickerModal = ({ visible, selectedDate, onSelect, onClose, markedDates, subject }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.dpOverlay} onPress={onClose}>
      <View style={styles.dpSheet}>
        <View style={styles.handle} />
        <View style={styles.dpHeader}>
          <Ionicons name="calendar" size={18} color="#00c6ff" />
          <Text style={styles.dpTitle}>Select Date</Text>
          <Pressable onPress={onClose} style={styles.dpClose}>
            <Ionicons name="close" size={20} color="#64748b" />
          </Pressable>
        </View>

        {/* Legend */}
        <View style={styles.dpLegend}>
          <View style={styles.dpLegendItem}>
            <View style={[styles.dpLegendDot, { backgroundColor: "#34d399" }]} />
            <Text style={styles.dpLegendText}>Attendance Marked</Text>
          </View>
          <View style={styles.dpLegendItem}>
            <View style={[styles.dpLegendDot, { backgroundColor: "#f87171" }]} />
            <Text style={styles.dpLegendText}>Not Marked</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
          {LAST_30_DAYS.map(d => {
            const isSelected = selectedDate === d.iso;
            const isMarked = markedDates?.includes(d.iso);
            const isSunday = d.isSunday;

            // ✅ Color logic
            const statusColor = isSunday ? "#374151" :
              isMarked ? "#34d399" : "#f87171";

            return (
              <Pressable key={d.iso}
                style={[
                  styles.dpRow,
                  isSelected && styles.dpRowActive,
                  isSunday && styles.dpRowSunday,
                ]}
                onPress={() => { onSelect(d.iso); onClose(); }}>

                {/* ✅ Left colored bar */}
                <View style={[styles.dpRowBar, { backgroundColor: statusColor }]} />

                <View style={styles.dpRowContent}>
                  <View style={styles.dpRowLeft}>
                    {d.isToday && (
                      <View style={styles.todayTag}>
                        <Text style={styles.todayTagText}>TODAY</Text>
                      </View>
                    )}
                    {isSunday && (
                      <View style={styles.sundayTag}>
                        <Text style={styles.sundayTagText}>SUN</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.dpRowLabel,
                      isSelected && { color: "#00c6ff" },
                      isSunday && { color: "#374151" },
                    ]}>
                      {d.label}
                    </Text>
                  </View>

                  <View style={styles.dpRowRight}>
                    {/* ✅ Status badge */}
                    {!isSunday && (
                      <View style={[styles.dpStatusBadge, {
                        backgroundColor: isMarked ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                        borderColor: isMarked ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)",
                      }]}>
                        <Ionicons
                          name={isMarked ? "checkmark-circle" : "close-circle"}
                          size={12}
                          color={isMarked ? "#34d399" : "#f87171"}
                        />
                        <Text style={[styles.dpStatusText, {
                          color: isMarked ? "#34d399" : "#f87171"
                        }]}>
                          {isMarked ? "Marked" : "Pending"}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.dpRowIso, isSelected && { color: "#00c6ff" }]}>
                      {d.iso}
                    </Text>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color="#00c6ff" />
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ── Subject Selector Card ──
const SubjectCard = ({ item, isSelected, onPress }) => {
  const color = getColor(item.department);
  const short = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  return (
    <Pressable
      style={[styles.subjectCard, isSelected && { borderColor: color, borderWidth: 1.5 }]}
      onPress={onPress}>
      <LinearGradient
        colors={isSelected ? [color + "30", color + "10"] : ["#1a2535", "#1a2535"]}
        style={styles.subjectGrad}>
        <View style={[styles.subjectIconBox, { backgroundColor: color + "22" }]}>
          <Ionicons name="book" size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName} numberOfLines={1}>{item.subjectName}</Text>
          {item.subjectCode ? <Text style={styles.subjectCode}>{item.subjectCode}</Text> : null}
          <View style={styles.subjectMeta}>
            <View style={[styles.metaBadge, { backgroundColor: color + "18" }]}>
              <Text style={[styles.metaBadgeText, { color }]}>{short} {item.admissionYear}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>Sem {item.semester}</Text>
            </View>
          </View>
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color={color} />}
      </LinearGradient>
    </Pressable>
  );
};

// ── Student Attendance Row ──
const StudentRow = ({ item, status, onToggle }) => {
  const color = getColor(item.department);
  const initials = item.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "S";
  const isPresent = status === "present";
  const isAbsent = status === "absent";
  const isUnmarked = !status;

  return (
    <View style={[
      styles.studentRow,
      isPresent && { borderColor: "rgba(52,211,153,0.25)" },
      isAbsent && { borderColor: "rgba(248,113,113,0.25)" },
    ]}>
      <View style={[
        styles.studentStrip,
        isPresent && { backgroundColor: "#34d399" },
        isAbsent && { backgroundColor: "#f87171" },
        isUnmarked && { backgroundColor: "#374151" },
      ]} />
      <View style={[styles.studentAvatar, { backgroundColor: color + "22" }]}>
        {item.profileImage
          ? <Image source={{ uri: item.profileImage }} style={styles.studentAvatarImg} />
          : <Text style={[styles.studentAvatarText, { color }]}>{initials}</Text>
        }
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.studentId}>{item.studentId || "—"}</Text>
        {isUnmarked && <Text style={styles.unmarkedText}>Not marked yet</Text>}
      </View>
      <View style={styles.attendanceBtns}>
        <Pressable
          style={[styles.attBtn, isPresent && styles.presentBtn]}
          onPress={() => onToggle(item._id, "present")}>
          <Ionicons
            name={isPresent ? "checkmark-circle" : "checkmark-circle-outline"}
            size={26} color={isPresent ? "#34d399" : "#374151"} />
        </Pressable>
        <Pressable
          style={[styles.attBtn, isAbsent && styles.absentBtn]}
          onPress={() => onToggle(item._id, "absent")}>
          <Ionicons
            name={isAbsent ? "close-circle" : "close-circle-outline"}
            size={26} color={isAbsent ? "#f87171" : "#374151"} />
        </Pressable>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════
export default function MarkAttendance() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const [subjects, setSubjects] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [stuLoading, setStuLoading] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ✅ NEW: dates on which attendance was marked for selected subject
  const [markedDates, setMarkedDates] = useState([]);

  useFocusEffect(useCallback(() => {
    loadSubjects();
    return () => {
      setSelectedSubject(null);
      setStudents([]);
      setAttendance({});
      setSubmitted(false);
      setMarkedDates([]);
    };
  }, []));

  const loadSubjects = async () => {
    try {
      setSubLoading(true);
      const r = await API.get("/subject-requests/my-subjects");
      const subs = r.data?.subjects || [];
      setSubjects(subs);
      if (params?.subjectRequestId) {
        const found = subs.find(s => s._id === params.subjectRequestId);
        if (found) selectSubject(found);
      }
    } catch {
      setSubjects([]);
    } finally {
      setSubLoading(false);
    }
  };

  // ✅ Load all marked dates for this subject
  const loadMarkedDates = async (subjectId) => {
    try {
      const res = await API.get(`/attendance/subject/${subjectId}`);
      const records = res.data?.records || [];
      // Extract unique dates
      const dates = [...new Set(records.map(r => r.date).filter(Boolean))];
      setMarkedDates(dates);
    } catch {
      setMarkedDates([]);
    }
  };

  const selectSubject = async (subject, newDate = date) => {
    setSelectedSubject(subject);
    setAttendance({});
    setAlreadyMarked(false);
    setSubmitted(false);
    setStuLoading(true);

    // ✅ Load marked dates for date picker colors
    loadMarkedDates(subject._id);

    try {
      const r = await API.get(`/subject-requests/${subject._id}/students`);
      const studs = r.data?.students || [];
      setStudents(studs);
      const init = {};
      studs.forEach(s => { init[s._id] = "absent"; });
      setAttendance(init);
      try {
        const ar = await API.get(`/attendance/check?subjectId=${subject._id}&date=${newDate}`);
        if (ar.data?.marked) {
          setAlreadyMarked(true);
          const existing = {};
          ar.data.records?.forEach(rec => { existing[rec.studentId] = rec.status; });
          setAttendance(existing);
        }
      } catch { }
    } catch {
      setStudents([]);
    } finally {
      setStuLoading(false);
    }
  };

  const handleDateChange = async (newDate) => {
    setDate(newDate);
    if (!selectedSubject) return;
    setAlreadyMarked(false);
    setSubmitted(false);
    const init = {};
    students.forEach(s => { init[s._id] = "absent"; });
    setAttendance(init);
    try {
      const ar = await API.get(`/attendance/check?subjectId=${selectedSubject._id}&date=${newDate}`);
      if (ar.data?.marked) {
        setAlreadyMarked(true);
        const existing = {};
        ar.data.records?.forEach(rec => { existing[rec.studentId] = rec.status; });
        setAttendance(existing);
      }
    } catch { }
  };

  const toggleAttendance = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const all = {};
    students.forEach(s => { all[s._id] = status; });
    setAttendance(all);
  };

  const presentCount = Object.values(attendance).filter(v => v === "present").length;
  const absentCount = Object.values(attendance).filter(v => v === "absent").length;
  const unmarkedCount = students.filter(s => !attendance[s._id]).length;
  const progressPct = students.length > 0
    ? Math.round(((presentCount + absentCount) / students.length) * 100)
    : 0;

  const handleSubmit = async () => {
    if (students.length === 0) return;
    const unmarked = students.filter(s => !attendance[s._id]);
    if (unmarked.length > 0) {
      Alert.alert("Incomplete", `${unmarked.length} students not marked.`);
      return;
    }
    try {
      setSubmitting(true);
      const records = students.map(s => ({ studentId: s._id, status: attendance[s._id] || "absent" }));
      const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
      await API.post("/attendance/mark", {
        subjectId: selectedSubject._id,
        subjectName: selectedSubject.subjectName,
        department: selectedSubject.department,
        semester: selectedSubject.semester,
        admissionYear: selectedSubject.admissionYear,
        date,
        day: dayName,
        records,
      });
      setAlreadyMarked(true);
      setSubmitted(true);
      // ✅ Add this date to markedDates
      setMarkedDates(prev => prev.includes(date) ? prev : [...prev, date]);
      Alert.alert("Attendance Submitted!", `Date: ${date}\nPresent: ${presentCount}, Absent: ${absentCount}`);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not submit attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateNice = (d) => {
    return new Date(d).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  };

  // ── STEP 1 ──
  if (!selectedSubject) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />
        <LinearGradient colors={["#0a0f1e", "#1a2a3a"]} style={styles.header}>
          <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>Select a subject to begin</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <Pressable style={styles.dateSelectorRow} onPress={() => setDatePickerOpen(true)}>
          <Ionicons name="calendar-outline" size={16} color="#00c6ff" />
          <Text style={styles.dateSelectorText}>{formatDateNice(date)}</Text>
          <Ionicons name="chevron-down" size={14} color="#374151" />
        </Pressable>

        {subLoading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
        ) : subjects.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}><Ionicons name="book-outline" size={40} color="#374151" /></View>
            <Text style={styles.emptyTitle}>No Accepted Subjects</Text>
            <Text style={styles.emptySubtitle}>Request subjects from My Subjects and wait for admin approval.</Text>
            <Pressable style={styles.goBtn} onPress={() => navigation.navigate("my-subjects")}>
              <Text style={styles.goBtnText}>Go to My Subjects →</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={subjects}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSubjects} tintColor="#f59e0b" />}
            ListHeaderComponent={() => (
              <View style={styles.stepCard}>
                <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Choose Subject</Text>
                  <Text style={styles.stepSub}>Tap a subject to mark attendance for {formatDateNice(date)}</Text>
                </View>
              </View>
            )}
            renderItem={({ item }) => (
              <SubjectCard item={item} isSelected={false} onPress={() => selectSubject(item)} />
            )}
          />
        )}

        <DatePickerModal
          visible={datePickerOpen}
          selectedDate={date}
          onSelect={handleDateChange}
          onClose={() => setDatePickerOpen(false)}
          markedDates={markedDates}
        />
      </View>
    );
  }

  // ── STEP 2 ──
  const color = getColor(selectedSubject.department);
  const short = selectedSubject.department?.match(/\(([^)]+)\)/)?.[1] || selectedSubject.department?.split(" ")[0] || "";
  const section = `${short} ${selectedSubject.admissionYear}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e" />

      <LinearGradient colors={["#0a0f1e", "#1a2a3a"]} style={styles.header}>
        <Pressable
          onPress={() => { setSelectedSubject(null); setStudents([]); setAttendance({}); setSubmitted(false); setMarkedDates([]); }}
          style={styles.menuBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedSubject.subjectName}</Text>
          <Text style={styles.headerSub}>{section} · Sem {selectedSubject.semester}</Text>
        </View>
        {submitted ? (
          <Pressable
            onPress={() => { setSelectedSubject(null); setStudents([]); setAttendance({}); setSubmitted(false); setMarkedDates([]); }}
            style={styles.anotherBtn}>
            <Ionicons name="add" size={18} color="#34d399" />
          </Pressable>
        ) : <View style={{ width: 40 }} />}
      </LinearGradient>

      {submitted && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#34d399" />
          <Text style={styles.successText}>
            Submitted for {formatDateNice(date)} · Present: {presentCount}, Absent: {absentCount}
          </Text>
        </View>
      )}

      {stuLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={color} /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              <LinearGradient colors={[color + "30", color + "10"]} style={styles.subjectBanner}>
                <View style={[styles.subjectIconBox, { backgroundColor: color + "22", marginRight: 12 }]}>
                  <Ionicons name="book" size={20} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectName, { fontSize: 15 }]}>{selectedSubject.subjectName}</Text>
                  <Text style={styles.subjectCode}>{section} · Sem {selectedSubject.semester}</Text>
                </View>
                {alreadyMarked && (
                  <View style={styles.alreadyBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#34d399" />
                    <Text style={styles.alreadyBadgeText}>{submitted ? "Submitted" : "Already Marked"}</Text>
                  </View>
                )}
              </LinearGradient>

              {/* ✅ Date Selector — shows green/red indicator for selected date */}
              <Pressable
                style={[
                  styles.dateSelectorCard,
                  markedDates.includes(date)
                    ? { borderColor: "rgba(52,211,153,0.4)", backgroundColor: "rgba(52,211,153,0.06)" }
                    : { borderColor: "rgba(0,198,255,0.2)", backgroundColor: "rgba(0,198,255,0.08)" }
                ]}
                onPress={() => !submitted && setDatePickerOpen(true)}>
                <View style={styles.dateSelectorLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={markedDates.includes(date) ? "#34d399" : "#00c6ff"}
                  />
                  <View>
                    <Text style={styles.dateSelectorLabel}>Attendance Date</Text>
                    <Text style={[styles.dateSelectorValue, {
                      color: markedDates.includes(date) ? "#34d399" : "#00c6ff"
                    }]}>
                      {formatDateNice(date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateSelectorRight}>
                  {/* ✅ Show marked/unmarked status on date card */}
                  <View style={[styles.dateStatusBadge, {
                    backgroundColor: markedDates.includes(date) ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                    borderColor: markedDates.includes(date) ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)",
                  }]}>
                    <Ionicons
                      name={markedDates.includes(date) ? "checkmark-circle" : "close-circle"}
                      size={12}
                      color={markedDates.includes(date) ? "#34d399" : "#f87171"}
                    />
                    <Text style={[styles.dateStatusText, {
                      color: markedDates.includes(date) ? "#34d399" : "#f87171"
                    }]}>
                      {markedDates.includes(date) ? "Marked" : "Not Marked"}
                    </Text>
                  </View>
                  {!submitted && (
                    <View style={styles.changeBtn}>
                      <Text style={styles.changeBtnText}>Change</Text>
                      <Ionicons name="chevron-down" size={12} color="#64748b" />
                    </View>
                  )}
                </View>
              </Pressable>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={[styles.countBadge, { backgroundColor: "rgba(52,211,153,0.15)", flex: 1 }]}>
                  <Text style={[styles.countNum, { color: "#34d399" }]}>{presentCount}</Text>
                  <Text style={styles.countLabel}>Present</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "rgba(248,113,113,0.15)", flex: 1 }]}>
                  <Text style={[styles.countNum, { color: "#f87171" }]}>{absentCount}</Text>
                  <Text style={styles.countLabel}>Absent</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "rgba(245,158,11,0.15)", flex: 1 }]}>
                  <Text style={[styles.countNum, { color: "#f59e0b" }]}>{unmarkedCount}</Text>
                  <Text style={styles.countLabel}>Unmarked</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "rgba(100,116,139,0.15)", flex: 1 }]}>
                  <Text style={[styles.countNum, { color: "#64748b" }]}>{students.length}</Text>
                  <Text style={styles.countLabel}>Total</Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${progressPct}%`,
                    backgroundColor: unmarkedCount === 0 ? "#34d399" : "#f59e0b",
                  }]} />
                </View>
                <Text style={styles.progressText}>{progressPct}% marked</Text>
              </View>

              {/* Mark All */}
              <View style={styles.markAllRow}>
                <Pressable style={styles.markAllPresent} onPress={() => markAll("present")}>
                  <Ionicons name="checkmark-done" size={14} color="#34d399" />
                  <Text style={[styles.markAllText, { color: "#34d399" }]}>All Present</Text>
                </Pressable>
                <Pressable style={styles.markAllAbsent} onPress={() => markAll("absent")}>
                  <Ionicons name="close" size={14} color="#f87171" />
                  <Text style={[styles.markAllText, { color: "#f87171" }]}>All Absent</Text>
                </Pressable>
              </View>

              {students.length > 0 && (
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>STUDENTS ({students.length})</Text>
                  {unmarkedCount > 0 && (
                    <View style={styles.unmarkedBadge}>
                      <Text style={styles.unmarkedBadgeText}>{unmarkedCount} unmarked</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <StudentRow item={item} status={attendance[item._id]} onToggle={toggleAttendance} />
          )}
          ListFooterComponent={() =>
            students.length > 0 ? (
              <Pressable
                style={[styles.submitBtn, (submitting || submitted) && { opacity: 0.7 }]}
                onPress={submitted ? undefined : handleSubmit}
                disabled={submitting || submitted}>
                <LinearGradient
                  colors={submitted ? ["#34d399", "#059669"] : alreadyMarked ? ["#f59e0b", "#d97706"] : ["#34d399", "#059669"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.submitGrad}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : submitted ? (
                    <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.submitText}>Attendance Submitted ✓</Text></>
                  ) : (
                    <><Ionicons name={alreadyMarked ? "refresh" : "checkmark-circle"} size={18} color="#fff" />
                      <Text style={styles.submitText}>{alreadyMarked ? "Update Attendance" : "Submit Attendance"}</Text></>
                  )}
                </LinearGradient>
              </Pressable>
            ) : null
          }
        />
      )}

      <DatePickerModal
        visible={datePickerOpen}
        selectedDate={date}
        onSelect={handleDateChange}
        onClose={() => setDatePickerOpen(false)}
        markedDates={markedDates}
        subject={selectedSubject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  anotherBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.15)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  dateSelectorRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,198,255,0.08)", marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.2)" },
  dateSelectorText: { flex: 1, color: "#00c6ff", fontSize: 13, fontWeight: "600" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.1)", marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)" },
  successText: { color: "#34d399", fontSize: 12, fontWeight: "600", flex: 1 },
  stepCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.2)", justifyContent: "center", alignItems: "center" },
  stepNum: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  stepTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  stepSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  subjectCard: { borderRadius: 16, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  subjectGrad: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderRadius: 16 },
  subjectIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  subjectName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  subjectCode: { color: "#64748b", fontSize: 11, marginTop: 2 },
  subjectMeta: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  metaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  metaBadgeText: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  subjectBanner: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  alreadyBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(52,211,153,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  alreadyBadgeText: { color: "#34d399", fontSize: 10, fontWeight: "700" },

  // Date selector card
  dateSelectorCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  dateSelectorLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateSelectorLabel: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  dateSelectorValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  dateSelectorRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  dateStatusText: { fontSize: 10, fontWeight: "700" },
  changeBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  changeBtnText: { color: "#64748b", fontSize: 11, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  countBadge: { alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  countNum: { fontSize: 18, fontWeight: "800" },
  countLabel: { color: "#64748b", fontSize: 9, marginTop: 2, fontWeight: "600" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  progressBg: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { color: "#64748b", fontSize: 11, fontWeight: "600", width: 70, textAlign: "right" },
  markAllRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  markAllPresent: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(52,211,153,0.1)", padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  markAllAbsent: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(248,113,113,0.1)", padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  markAllText: { fontSize: 13, fontWeight: "700" },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionLabel: { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  unmarkedBadge: { backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  unmarkedBadgeText: { color: "#f59e0b", fontSize: 10, fontWeight: "700" },
  studentRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a2535", borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  studentStrip: { width: 3, alignSelf: "stretch" },
  studentAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", marginLeft: 10, marginRight: 10 },
  studentAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  studentAvatarText: { fontSize: 15, fontWeight: "800" },
  studentInfo: { flex: 1, paddingVertical: 12 },
  studentName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  studentId: { color: "#64748b", fontSize: 11, marginTop: 2 },
  unmarkedText: { color: "#f59e0b", fontSize: 10, marginTop: 2 },
  attendanceBtns: { flexDirection: "row", gap: 8, paddingRight: 12 },
  attBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)" },
  presentBtn: { backgroundColor: "rgba(52,211,153,0.15)" },
  absentBtn: { backgroundColor: "rgba(248,113,113,0.15)" },
  submitBtn: { marginTop: 16, borderRadius: 16, overflow: "hidden" },
  submitGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  emptyIcon: { alignItems: "center", gap: 8 },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySubtitle: { color: "#1f2937", fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18 },
  goBtn: { marginTop: 20, backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  goBtnText: { color: "#f59e0b", fontWeight: "700", fontSize: 14 },

  // Date Picker Modal
  dpOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  dpSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  dpHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 20, paddingBottom: 8 },
  dpTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "700" },
  dpClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },

  // Legend
  dpLegend: { flexDirection: "row", gap: 16, paddingHorizontal: 20, paddingBottom: 10 },
  dpLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dpLegendDot: { width: 10, height: 10, borderRadius: 5 },
  dpLegendText: { color: "#64748b", fontSize: 11 },

  // Row
  dpRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, marginBottom: 6, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.03)" },
  dpRowActive: { backgroundColor: "rgba(0,198,255,0.08)", borderWidth: 1, borderColor: "rgba(0,198,255,0.3)" },
  dpRowSunday: { opacity: 0.4 },
  dpRowBar: { width: 4, alignSelf: "stretch" },
  dpRowContent: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12 },
  dpRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  dpRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dpRowLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  dpRowIso: { color: "#374151", fontSize: 11 },

  dpStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  dpStatusText: { fontSize: 10, fontWeight: "700" },

  todayTag: { backgroundColor: "rgba(0,198,255,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  todayTagText: { color: "#00c6ff", fontSize: 9, fontWeight: "800" },
  sundayTag: { backgroundColor: "rgba(100,116,139,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  sundayTagText: { color: "#64748b", fontSize: 9, fontWeight: "800" },
});