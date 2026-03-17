import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  StatusBar, ActivityIndicator, Alert, Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const COLLEGES = [
  "Nims Institute of Engineering and Technology",
  "Nims College of Management Studies",
  "Nims College of Nursing",
  "Nims College of Pharmacy",
  "Nims College of Law",
  "Nims College of Dental",
];
const DEPARTMENTS = [
  "Computer Science Engineering (CSE)",
  "Information Technology (IT)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering",
  "Chemical Engineering",
  "Artificial Intelligence & Machine Learning",
  "Data Science Engineering",
];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => (CURRENT_YEAR - i).toString());

const TIME_SLOTS = [];
let slotNum = 1;
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push({
    label: `${h}:00 - ${h + 1}:00`,
    startTime: `${String(h).padStart(2, "0")}:00`,
    endTime: `${String(h + 1).padStart(2, "0")}:00`,
    slotNumber: slotNum++,
  });
}

// ── Picker Modal ──
const PickerModal = ({ visible, title, options, selected, onSelect, onClose, accent = "#34d399" }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.pickerOverlay} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <View style={styles.handle} />
        <Text style={styles.pickerTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map(opt => (
            <Pressable key={opt} style={[styles.pickerOption, selected === opt && { backgroundColor: accent + "18", borderWidth: 1, borderColor: accent + "35" }]}
              onPress={() => { onSelect(opt); onClose(); }}>
              <Text style={[styles.pickerOptionText, selected === opt && { color: accent }]} numberOfLines={2}>{opt}</Text>
              {selected === opt && <Ionicons name="checkmark-circle" size={16} color={accent} />}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ── Teacher Card ──
const TeacherCard = ({ teacher, selected, onSelect }) => {
  const initials = teacher.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "T";
  return (
    <Pressable
      style={[styles.teacherCard, selected && styles.teacherCardSelected]}
      onPress={() => onSelect(teacher)}
    >
      <View style={[styles.teacherAvatar, selected && { backgroundColor: "rgba(245,158,11,0.25)" }]}>
        <Text style={[styles.teacherAvatarText, selected && { color: "#f59e0b" }]}>{initials}</Text>
      </View>
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>{teacher.name}</Text>
        <Text style={styles.teacherId}>ID: {teacher.teacherId || "—"}</Text>
        <Text style={styles.teacherEmail} numberOfLines={1}>{teacher.email}</Text>
      </View>
      {selected
        ? <Ionicons name="checkmark-circle" size={22} color="#f59e0b" />
        : <View style={styles.teacherRadio} />
      }
    </Pressable>
  );
};

// ── Slot Card ──
const SlotCard = ({ day, slot, selected, onToggle }) => (
  <Pressable
    style={[styles.slotChip, selected && styles.slotChipActive]}
    onPress={() => onToggle(day, slot)}
  >
    <Text style={[styles.slotChipText, selected && { color: "#f59e0b" }]}>{slot.label}</Text>
    {selected && <Ionicons name="checkmark" size={10} color="#f59e0b" />}
  </Pressable>
);

// ══════════════════════════════════════════
export default function AssignSubject() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Subject info from params
  const subjectId = params.subjectId;
  const subjectName = params.subjectName;
  const subjectCode = params.subjectCode;

  // Step state
  const [step, setStep] = useState(1); // 1=Class, 2=Teacher, 3=Timetable, 4=Review

  // Step 1 — Class
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");

  // Step 2 — Teacher
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Step 3 — Timetable
  const [selectedSlots, setSelectedSlots] = useState({});
  const [activeDay, setActiveDay] = useState("Monday");
  const [roomInput] = useState({});

  // Pickers
  const [picker, setPicker] = useState({ visible: false, type: "" });

  // Saving
  const [saving, setSaving] = useState(false);

  const openPicker = (type) => setPicker({ visible: true, type });
  const closePicker = () => setPicker({ visible: false, type: "" });

  // Load teachers when dept+college selected
  const loadTeachers = async (col, dept) => {
    if (!col || !dept) return;
    try {
      setTeachersLoading(true);
      const res = await API.get("/assignments-admin/teachers-by-dept", {
        params: { college: col, department: dept }
      });
      setTeachers(res.data?.teachers || []);
    } catch {
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  };

  const handleCollegeSelect = (val) => {
    setCollege(val);
    setSelectedTeacher(null);
    setTeachers([]);
    if (department) loadTeachers(val, department);
  };

  const handleDeptSelect = (val) => {
    setDepartment(val);
    setSelectedTeacher(null);
    setTeachers([]);
    if (college) loadTeachers(college, val);
  };

  // Toggle timetable slot
  const toggleSlot = (day, slot) => {
    setSelectedSlots(prev => {
      const key = `${day}_${slot.startTime}`;
      const updated = { ...prev };
      if (updated[key]) delete updated[key];
      else updated[key] = { day, ...slot, room: roomInput[key] || "" };
      return updated;
    });
  };

  const totalSlots = Object.keys(selectedSlots).length;

  // Step validations
  const step1Valid = college && department && semester && admissionYear;
  const step2Valid = !!selectedTeacher;
  const step3Valid = totalSlots > 0;

  // Submit
  const handleSubmit = async () => {
    try {
      setSaving(true);
      const timetableSlots = Object.values(selectedSlots).map((s, i) => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room || "",
        slotNumber: i + 1,
      }));

      const res = await API.post("/assignments-admin/assign", {
        subjectId,
        teacherId: selectedTeacher._id,
        college,
        department,
        semester: Number(semester),
        admissionYear,
        timetableSlots,
      });

      Alert.alert(
        "Success! ✅",
        res.data.message || "Subject assigned successfully!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert("Error ❌", e.response?.data?.message || "Could not assign subject");
    } finally {
      setSaving(false);
    }
  };

  // ── Step Indicator ──
  const StepDot = ({ num }) => (
    <View style={styles.stepRow}>
      <View style={[styles.stepDot, step >= num && styles.stepDotActive]}>
        {step > num
          ? <Ionicons name="checkmark" size={12} color="#000" />
          : <Text style={[styles.stepDotText, step >= num && { color: "#000" }]}>{num}</Text>
        }
      </View>
      {num < 4 && <View style={[styles.stepLine, step > num && styles.stepLineActive]} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Assign Subject</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{subjectName} {subjectCode ? `· ${subjectCode}` : ""}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Subject Badge */}
      <View style={styles.subjectBadgeRow}>
        <View style={styles.subjectBadge}>
          <Ionicons name="book" size={14} color="#34d399" />
          <Text style={styles.subjectBadgeText}>{subjectName}</Text>
          {subjectCode ? <Text style={styles.subjectCodeBadge}>{subjectCode}</Text> : null}
        </View>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepsContainer}>
        {[1, 2, 3, 4].map(n => <StepDot key={n} num={n} />)}
      </View>
      <View style={styles.stepLabels}>
        {["Class", "Teacher", "Schedule", "Review"].map((l, i) => (
          <Text key={l} style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{l}</Text>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">

        {/* ── STEP 1: Class Info ── */}
        {step === 1 && (
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <Ionicons name="school" size={18} color="#34d399" />
              <Text style={styles.stepCardTitle}>Select Class</Text>
            </View>
            <Text style={styles.stepCardSub}>Choose which class this subject will be taught to</Text>

            {/* College */}
            <Text style={styles.fieldLabel}>College *</Text>
            <Pressable style={styles.selectRow} onPress={() => openPicker("college")}>
              <Ionicons name="business-outline" size={16} color="#64748b" />
              <Text style={[styles.selectText, college && { color: "#fff" }]} numberOfLines={1}>
                {college || "Select College"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#374151" />
            </Pressable>

            {/* Department */}
            <Text style={styles.fieldLabel}>Department *</Text>
            <Pressable style={styles.selectRow} onPress={() => openPicker("department")}>
              <Ionicons name="school-outline" size={16} color="#64748b" />
              <Text style={[styles.selectText, department && { color: "#fff" }]} numberOfLines={1}>
                {department || "Select Department"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#374151" />
            </Pressable>

            {/* Semester */}
            <Text style={styles.fieldLabel}>Semester *</Text>
            <Pressable style={styles.selectRow} onPress={() => openPicker("semester")}>
              <Ionicons name="layers-outline" size={16} color="#64748b" />
              <Text style={[styles.selectText, semester && { color: "#fff" }]}>
                {semester ? `Semester ${semester}` : "Select Semester"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#374151" />
            </Pressable>

            {/* Admission Year */}
            <Text style={styles.fieldLabel}>Batch (Admission Year) *</Text>
            <Pressable style={styles.selectRow} onPress={() => openPicker("admissionYear")}>
              <Ionicons name="calendar-outline" size={16} color="#64748b" />
              <Text style={[styles.selectText, admissionYear && { color: "#fff" }]}>
                {admissionYear || "Select Batch Year"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#374151" />
            </Pressable>

            {/* Teacher count preview */}
            {college && department && (
              <View style={styles.previewBox}>
                <Ionicons name="people-outline" size={14} color="#34d399" />
                <Text style={styles.previewText}>
                  {teachersLoading
                    ? "Loading teachers..."
                    : `${teachers.length} teacher(s) found in this department`}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.nextBtn, !step1Valid && { opacity: 0.4 }]}
              onPress={() => step1Valid && setStep(2)}
              disabled={!step1Valid}
            >
              <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                <Text style={styles.nextBtnText}>Next — Select Teacher</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* ── STEP 2: Select Teacher ── */}
        {step === 2 && (
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <Ionicons name="person" size={18} color="#f59e0b" />
              <Text style={styles.stepCardTitle}>Select Teacher</Text>
            </View>
            <Text style={styles.stepCardSub}>
              {department?.split("(")[0]?.trim()} — {teachers.length} teacher(s) available
            </Text>

            {teachersLoading
              ? <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 30 }} />
              : teachers.length === 0
                ? (
                  <View style={styles.emptyTeachers}>
                    <Ionicons name="person-outline" size={40} color="#374151" />
                    <Text style={styles.emptyTeachersText}>No teachers found</Text>
                    <Text style={styles.emptyTeachersSub}>
                      No teachers registered for {department?.split("(")[0]?.trim()}
                    </Text>
                  </View>
                )
                : teachers.map(t => (
                  <TeacherCard
                    key={t._id}
                    teacher={t}
                    selected={selectedTeacher?._id === t._id}
                    onSelect={setSelectedTeacher}
                  />
                ))
            }

            <Pressable
              style={[styles.nextBtn, !step2Valid && { opacity: 0.4 }]}
              onPress={() => step2Valid && setStep(3)}
              disabled={!step2Valid}
            >
              <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                <Text style={styles.nextBtnText}>Next — Set Schedule</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* ── STEP 3: Timetable ── */}
        {step === 3 && (
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <Ionicons name="calendar" size={18} color="#a78bfa" />
              <Text style={styles.stepCardTitle}>Set Schedule</Text>
            </View>
            <Text style={styles.stepCardSub}>
              Select time slots ({totalSlots} selected)
            </Text>

            {/* Day Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {DAYS.map(day => (
                <Pressable key={day}
                  style={[styles.dayTab, activeDay === day && styles.dayTabActive]}
                  onPress={() => setActiveDay(day)}>
                  <Text style={[styles.dayTabText, activeDay === day && { color: "#a78bfa" }]}>
                    {day.slice(0, 3)}
                  </Text>
                  {Object.keys(selectedSlots).filter(k => k.startsWith(day)).length > 0 && (
                    <View style={styles.dayDot} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            {/* Time Slots Grid */}
            <Text style={styles.dayLabel}>{activeDay}</Text>
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map(slot => {
                const key = `${activeDay}_${slot.startTime}`;
                const isSelected = !!selectedSlots[key];
                return (
                  <SlotCard
                    key={key}
                    day={activeDay}
                    slot={slot}
                    selected={isSelected}
                    onToggle={toggleSlot}
                  />
                );
              })}
            </View>

            {/* Selected slots summary */}
            {totalSlots > 0 && (
              <View style={styles.slotsSummary}>
                <Ionicons name="time-outline" size={14} color="#a78bfa" />
                <Text style={styles.slotsSummaryText}>
                  {totalSlots} slot(s) selected across {[...new Set(Object.values(selectedSlots).map(s => s.day))].length} day(s)
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.nextBtn, !step3Valid && { opacity: 0.4 }]}
              onPress={() => step3Valid && setStep(4)}
              disabled={!step3Valid}
            >
              <LinearGradient colors={["#a78bfa", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                <Text style={styles.nextBtnText}>Next — Review</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <View style={styles.stepCard}>
            <View style={styles.stepCardHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#34d399" />
              <Text style={styles.stepCardTitle}>Review & Assign</Text>
            </View>

            {/* Subject */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>📚 SUBJECT</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{subjectName}</Text>
              </View>
              {subjectCode && (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Code</Text>
                  <Text style={[styles.reviewValue, { color: "#34d399" }]}>{subjectCode}</Text>
                </View>
              )}
            </View>

            {/* Class */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>🏫 CLASS</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>College</Text>
                <Text style={styles.reviewValue} numberOfLines={2}>{college}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Department</Text>
                <Text style={styles.reviewValue}>{department?.split("(")[0]?.trim()}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Semester</Text>
                <Text style={styles.reviewValue}>Semester {semester}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Batch</Text>
                <Text style={styles.reviewValue}>{admissionYear}</Text>
              </View>
            </View>

            {/* Teacher */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>👨‍🏫 TEACHER</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{selectedTeacher?.name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>ID</Text>
                <Text style={[styles.reviewValue, { color: "#f59e0b" }]}>{selectedTeacher?.teacherId}</Text>
              </View>
            </View>

            {/* Schedule */}
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>🗓️ SCHEDULE ({totalSlots} slots)</Text>
              {DAYS.map(day => {
                const daySlots = Object.values(selectedSlots).filter(s => s.day === day);
                if (!daySlots.length) return null;
                return (
                  <View key={day} style={styles.reviewDayRow}>
                    <Text style={styles.reviewDayName}>{day}</Text>
                    <View style={styles.reviewDaySlots}>
                      {daySlots.map((s, i) => (
                        <View key={i} style={styles.reviewSlotBadge}>
                          <Text style={styles.reviewSlotText}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.nextBtnText}>Assign Subject to Teacher</Text></>
                }
              </LinearGradient>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal visible={picker.type === "college"} title="Select College" options={COLLEGES} selected={college} onSelect={handleCollegeSelect} onClose={closePicker} accent="#34d399" />
      <PickerModal visible={picker.type === "department"} title="Select Department" options={DEPARTMENTS} selected={department} onSelect={handleDeptSelect} onClose={closePicker} accent="#34d399" />
      <PickerModal visible={picker.type === "semester"} title="Select Semester" options={SEMESTERS} selected={semester} onSelect={setSemester} onClose={closePicker} accent="#a78bfa" />
      <PickerModal visible={picker.type === "admissionYear"} title="Select Batch Year" options={YEARS} selected={admissionYear} onSelect={setAdmissionYear} onClose={closePicker} accent="#f59e0b" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },

  subjectBadgeRow: { paddingHorizontal: 16, marginBottom: 8 },
  subjectBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.1)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)" },
  subjectBadgeText: { color: "#34d399", fontSize: 13, fontWeight: "700" },
  subjectCodeBadge: { color: "#64748b", fontSize: 11 },

  stepsContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  stepDotActive: { backgroundColor: "#34d399", borderColor: "#34d399" },
  stepDotText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  stepLine: { width: 30, height: 2, backgroundColor: "#1a2535" },
  stepLineActive: { backgroundColor: "#34d399" },
  stepLabels: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, marginTop: 4, marginBottom: 8 },
  stepLabel: { color: "#374151", fontSize: 10, fontWeight: "600" },
  stepLabelActive: { color: "#34d399" },

  body: { padding: 16 },
  stepCard: { backgroundColor: "#0f1923", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  stepCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  stepCardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  stepCardSub: { color: "#64748b", fontSize: 12, marginBottom: 20 },

  fieldLabel: { color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  selectText: { flex: 1, color: "#374151", fontSize: 14 },

  previewBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(52,211,153,0.08)", padding: 12, borderRadius: 10, marginTop: 16, borderWidth: 1, borderColor: "rgba(52,211,153,0.15)" },
  previewText: { color: "#34d399", fontSize: 12 },

  nextBtn: { marginTop: 24, borderRadius: 14, overflow: "hidden" },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  teacherCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  teacherCardSelected: { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)" },
  teacherAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(245,158,11,0.15)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  teacherAvatarText: { color: "#f59e0b", fontSize: 16, fontWeight: "800" },
  teacherInfo: { flex: 1 },
  teacherName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  teacherId: { color: "#f59e0b", fontSize: 11, marginTop: 2 },
  teacherEmail: { color: "#64748b", fontSize: 11, marginTop: 1 },
  teacherRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#374151" },

  emptyTeachers: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTeachersText: { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptyTeachersSub: { color: "#1f2937", fontSize: 12, textAlign: "center" },

  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  dayTabActive: { backgroundColor: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.3)" },
  dayTabText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  dayLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "700", marginBottom: 10 },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#a78bfa", marginTop: 3 },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", flexDirection: "row", alignItems: "center", gap: 4 },
  slotChipActive: { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)" },
  slotChipText: { color: "#64748b", fontSize: 11, fontWeight: "600" },

  slotsSummary: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(167,139,250,0.08)", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)" },
  slotsSummaryText: { color: "#a78bfa", fontSize: 12 },

  reviewSection: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  reviewSectionTitle: { color: "#64748b", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  reviewLabel: { color: "#374151", fontSize: 12 },
  reviewValue: { color: "#e2e8f0", fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" },
  reviewDayRow: { marginBottom: 8 },
  reviewDayName: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  reviewDaySlots: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reviewSlotBadge: { backgroundColor: "rgba(167,139,250,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  reviewSlotText: { color: "#a78bfa", fontSize: 10, fontWeight: "600" },

  submitBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden" },

  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginBottom: 12 },
  pickerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, marginBottom: 6, backgroundColor: "rgba(255,255,255,0.04)" },
  pickerOptionText: { color: "#94a3b8", fontSize: 13, flex: 1 },
});