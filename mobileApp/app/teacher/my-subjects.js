import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height } = Dimensions.get("window");

const SEMESTERS = ["1","2","3","4","5","6","7","8"];
const SECTIONS  = ["All","A","B","C","D"];
const YEARS     = ["2020","2021","2022","2023","2024","2025","2026"];
const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };
const DAY_COLORS = {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c",
};

// 8 AM → 6 PM time slots
const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  const start = `${String(h).padStart(2,"0")}:00`;
  const end   = `${String(h+1).padStart(2,"0")}:00`;
  const label = `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
  TIME_SLOTS.push({ startTime: start, endTime: end, label });
}

const STATUS_COLORS = {
  pending:  { bg:"rgba(245,158,11,0.15)",  border:"#f59e0b", text:"#f59e0b" },
  accepted: { bg:"rgba(52,211,153,0.15)",  border:"#34d399", text:"#34d399" },
  rejected: { bg:"rgba(248,113,113,0.15)", border:"#f87171", text:"#f87171" },
};

const TYPE_COLORS = { Theory:"#00c6ff", Lab:"#f59e0b", Both:"#a78bfa" };
const SEM_COLORS  = ["#00c6ff","#34d399","#a78bfa","#f59e0b","#f87171","#60a5fa","#fb923c","#e879f9"];

// ─────────────────────────────────────────────────────────
// Schedule Modal — Teacher sets his class schedule
// ─────────────────────────────────────────────────────────
const ScheduleModal = ({ visible, subject, request, existingSchedule, onClose, onSaved }) => {
  const [activeDay,     setActiveDay]     = useState("Monday");
  const [selectedSlots, setSelectedSlots] = useState({});
  const [roomInputs,    setRoomInputs]    = useState({});
  const [saving,        setSaving]        = useState(false);

  // Pre-fill if existing schedule
  React.useEffect(() => {
    if (visible && existingSchedule?.slots) {
      const preSlots = {};
      const preRooms = {};
      existingSchedule.slots.forEach(s => {
        const key = `${s.day}_${s.startTime}`;
        preSlots[key] = { day: s.day, startTime: s.startTime, endTime: s.endTime, label: s.startTime };
        preRooms[key] = s.room || "";
      });
      setSelectedSlots(preSlots);
      setRoomInputs(preRooms);
    } else if (visible) {
      setSelectedSlots({});
      setRoomInputs({});
    }
  }, [visible, existingSchedule]);

  const toggleSlot = (day, slot) => {
    const key = `${day}_${slot.startTime}`;
    setSelectedSlots(prev => {
      const updated = { ...prev };
      if (updated[key]) delete updated[key];
      else updated[key] = { day, startTime: slot.startTime, endTime: slot.endTime, label: slot.label };
      return updated;
    });
  };

  const totalSlots = Object.keys(selectedSlots).length;

  const handleSave = async () => {
    if (totalSlots === 0) return Alert.alert("Error", "Kam se kam ek time slot select karo");
    if (!request)         return Alert.alert("Error", "No accepted request found");

    const slots = Object.values(selectedSlots).map((s, i) => ({
      day:       s.day,
      startTime: s.startTime,
      endTime:   s.endTime,
      room:      roomInputs[`${s.day}_${s.startTime}`] || "",
      slotNumber: i + 1,
    }));

    try {
      setSaving(true);
      await API.post("/teacher-schedule", {
        subjectId:        subject._id,
        subjectName:      subject.name,
        subjectCode:      subject.code || "",
        college:          subject.college,
        department:       subject.department,
        semester:         Number(request.semester),
        admissionYear:    request.admissionYear,
        section:          request.section || "All",
        subjectRequestId: request._id,
        slots,
      });
      onSaved?.();
      onClose();
      Alert.alert("✅ Schedule Saved!", `${totalSlots} class slot${totalSlots>1?"s":""} set ho gaye!`);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.schedSheet}>
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.schedHeader}>
            <View style={styles.schedHeaderLeft}>
              <Ionicons name="calendar" size={18} color="#a78bfa" />
              <View>
                <Text style={styles.schedTitle}>Set Class Schedule</Text>
                <Text style={styles.schedSub} numberOfLines={1}>{subject?.name}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.schedCloseBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {/* Request info */}
          {request && (
            <View style={styles.schedInfoRow}>
              <View style={styles.schedInfoChip}>
                <Ionicons name="layers-outline" size={11} color="#a78bfa" />
                <Text style={styles.schedInfoText}>Sem {request.semester}</Text>
              </View>
              <View style={styles.schedInfoChip}>
                <Ionicons name="calendar-outline" size={11} color="#f59e0b" />
                <Text style={styles.schedInfoText}>Batch {request.admissionYear}</Text>
              </View>
              {request.section && request.section !== "All" && (
                <View style={styles.schedInfoChip}>
                  <Ionicons name="people-outline" size={11} color="#34d399" />
                  <Text style={styles.schedInfoText}>Sec {request.section}</Text>
                </View>
              )}
              {totalSlots > 0 && (
                <View style={[styles.schedInfoChip, { backgroundColor:"rgba(167,139,250,0.15)", borderColor:"#a78bfa" }]}>
                  <Ionicons name="checkmark-circle" size={11} color="#a78bfa" />
                  <Text style={[styles.schedInfoText, { color:"#a78bfa" }]}>{totalSlots} slots</Text>
                </View>
              )}
            </View>
          )}

          {/* Day Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.dayTabsScroll} contentContainerStyle={styles.dayTabsContent}>
            {DAYS.map(day => {
              const count   = Object.keys(selectedSlots).filter(k => k.startsWith(day)).length;
              const color   = DAY_COLORS[day];
              const isActive = activeDay === day;
              return (
                <Pressable key={day}
                  style={[styles.dayTab, isActive && { backgroundColor: color+"20", borderColor: color+"55" }]}
                  onPress={() => setActiveDay(day)}>
                  <Text style={[styles.dayTabText, isActive && { color }]}>{DAY_SHORT[day]}</Text>
                  {count > 0 && (
                    <View style={[styles.dayTabDot, { backgroundColor: color }]}>
                      <Text style={styles.dayTabDotText}>{count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.schedBody}
            keyboardShouldPersistTaps="handled">

            {/* Active day label */}
            <View style={styles.activeDayRow}>
              <View style={[styles.activeDayDot, { backgroundColor: DAY_COLORS[activeDay] }]} />
              <Text style={[styles.activeDayText, { color: DAY_COLORS[activeDay] }]}>{activeDay}</Text>
              <Text style={styles.activeDayHint}>— tap slots to select</Text>
            </View>

            {/* Time Slots Grid */}
            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map(slot => {
                const key      = `${activeDay}_${slot.startTime}`;
                const selected = !!selectedSlots[key];
                const color    = DAY_COLORS[activeDay];
                return (
                  <Pressable key={key}
                    style={[styles.slotChip, selected && { backgroundColor: color+"22", borderColor: color }]}
                    onPress={() => toggleSlot(activeDay, slot)}>
                    <Ionicons
                      name={selected ? "checkmark-circle" : "time-outline"}
                      size={14} color={selected ? color : "#374151"} />
                    <Text style={[styles.slotChipText, selected && { color }]}>{slot.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Room input for selected slots of active day */}
            {Object.keys(selectedSlots).filter(k => k.startsWith(activeDay)).length > 0 && (
              <View style={styles.roomSection}>
                <Text style={styles.roomSectionTitle}>📍 Room Number (optional)</Text>
                {Object.entries(selectedSlots)
                  .filter(([k]) => k.startsWith(activeDay))
                  .map(([key, slot]) => (
                    <View key={key} style={styles.roomInputRow}>
                      <View style={[styles.roomTimeTag, { backgroundColor: DAY_COLORS[activeDay]+"18" }]}>
                        <Text style={[styles.roomTimeText, { color: DAY_COLORS[activeDay] }]}>{slot.label}</Text>
                      </View>
                      <TextInput
                        style={styles.roomInput}
                        placeholder="Room no."
                        placeholderTextColor="#374151"
                        value={roomInputs[key] || ""}
                        onChangeText={v => setRoomInputs(prev => ({ ...prev, [key]: v }))}
                        maxLength={10}
                      />
                    </View>
                  ))
                }
              </View>
            )}

            {/* Summary of all selected slots */}
            {totalSlots > 0 && (
              <View style={styles.slotSummary}>
                <View style={styles.slotSummaryHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#a78bfa" />
                  <Text style={styles.slotSummaryTitle}>Selected Schedule ({totalSlots} slots)</Text>
                </View>
                {DAYS.map(day => {
                  const daySlots = Object.entries(selectedSlots).filter(([k]) => k.startsWith(day));
                  if (!daySlots.length) return null;
                  return (
                    <View key={day} style={styles.summaryDayRow}>
                      <Text style={[styles.summaryDayName, { color: DAY_COLORS[day] }]}>{DAY_SHORT[day]}</Text>
                      <View style={styles.summarySlots}>
                        {daySlots.map(([key, s]) => (
                          <View key={key} style={[styles.summarySlotBadge, { backgroundColor: DAY_COLORS[day]+"18" }]}>
                            <Text style={[styles.summarySlotText, { color: DAY_COLORS[day] }]}>{s.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Save Button */}
            <Pressable
              style={[styles.saveSchedBtn, (saving || totalSlots === 0) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving || totalSlots === 0}>
              <LinearGradient colors={["#a78bfa","#7c3aed"]}
                start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={styles.saveSchedGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={styles.saveSchedText}>
                        {existingSchedule ? "Update Schedule" : "Save Schedule"}
                      </Text>
                    </>
                }
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────
// Subject Card
// ─────────────────────────────────────────────────────────
const SubjectCard = ({ item, request, scheduleMap, onRequest, onSetSchedule }) => {
  const semColor  = SEM_COLORS[(Number(item.semester) - 1) % SEM_COLORS.length];
  const typeColor = TYPE_COLORS[item.type] || "#64748b";
  const deptShort = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";

  const isAccepted = request?.status === "accepted";
  const isPending  = request?.status === "pending";
  const isRejected = request?.status === "rejected";

  // Check if schedule exists for this subject
  const scheduleKey = `${item._id}_${request?.admissionYear}_${request?.semester}`;
  const hasSchedule = !!scheduleMap?.[scheduleKey];

  return (
    <View style={[
      styles.subCard,
      isAccepted && { borderColor:"rgba(52,211,153,0.4)", backgroundColor:"rgba(52,211,153,0.03)" },
      isPending  && { borderColor:"rgba(245,158,11,0.35)" },
    ]}>
      {/* Left Icon */}
      <View style={[styles.subIconWrap, { backgroundColor: semColor + "18" }]}>
        <Ionicons name="book" size={22} color={semColor} />
      </View>

      {/* Info */}
      <View style={styles.subInfo}>
        <Text style={styles.subName} numberOfLines={1}>{item.name}</Text>

        <View style={styles.subBadgeRow}>
          {item.code && (
            <View style={[styles.codeBadge, { backgroundColor: semColor+"18" }]}>
              <Text style={[styles.codeBadgeText, { color: semColor }]}>{item.code}</Text>
            </View>
          )}
          <View style={[styles.semBadge, { backgroundColor: semColor+"18" }]}>
            <Text style={[styles.semBadgeText, { color: semColor }]}>Sem {item.semester}</Text>
          </View>
          {item.type && (
            <View style={[styles.typeBadge, { backgroundColor: typeColor+"18" }]}>
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
              <Text style={[styles.subMetaText, { color:"#a78bfa" }]}>{item.credits} cr</Text>
            </>
          )}
        </View>

        {/* Schedule status */}
        {isAccepted && (
          hasSchedule ? (
            <View style={styles.schedSetRow}>
              <Ionicons name="checkmark-circle" size={11} color="#a78bfa" />
              <Text style={styles.schedSetText}>Schedule set ✅</Text>
            </View>
          ) : (
            <View style={styles.schedNotSetRow}>
              <Ionicons name="alert-circle-outline" size={11} color="#f59e0b" />
              <Text style={styles.schedNotSetText}>Schedule set nahi hai</Text>
            </View>
          )
        )}
      </View>

      {/* Right Actions */}
      <View style={styles.subAction}>
        {isAccepted && (
          <>
            {/* Schedule button */}
            <Pressable
              style={[styles.scheduleBtn, hasSchedule && { backgroundColor:"rgba(167,139,250,0.2)", borderColor:"#a78bfa" }]}
              onPress={() => onSetSchedule(item, request)}>
              <Ionicons name={hasSchedule ? "calendar" : "calendar-outline"} size={13} color="#a78bfa" />
              <Text style={styles.scheduleBtnText}>{hasSchedule ? "Edit" : "Schedule"}</Text>
            </Pressable>
            <View style={styles.acceptedPill}>
              <Ionicons name="checkmark-circle" size={12} color="#34d399" />
              <Text style={styles.acceptedPillText}>Active</Text>
            </View>
          </>
        )}
        {isPending && (
          <View style={styles.pendingPill}>
            <Ionicons name="time-outline" size={12} color="#f59e0b" />
            <Text style={styles.pendingPillText}>Pending</Text>
          </View>
        )}
        {isRejected && (
          <Pressable style={styles.requestBtn} onPress={() => onRequest(item)}>
            <Ionicons name="refresh-outline" size={12} color="#fff" />
            <Text style={styles.requestBtnText}>Re-request</Text>
          </Pressable>
        )}
        {!request && (
          <Pressable style={styles.requestBtn} onPress={() => onRequest(item)}>
            <Ionicons name="send-outline" size={12} color="#fff" />
            <Text style={styles.requestBtnText}>Request</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// Request Card
// ─────────────────────────────────────────────────────────
const RequestCard = ({ item, onDelete, onAttendance, onSetSchedule, scheduleMap }) => {
  const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
  const scheduleKey = `${item.subjectId}_${item.admissionYear}_${item.semester}`;
  const hasSchedule = !!scheduleMap?.[scheduleKey];

  return (
    <View style={[
      styles.reqCard,
      item.status === "accepted" && { borderColor:"rgba(52,211,153,0.3)", backgroundColor:"rgba(52,211,153,0.03)" },
    ]}>
      <View style={[styles.reqAccent, { backgroundColor: sc.border }]} />
      <View style={styles.reqBody}>
        <Text style={styles.reqSubName}>{item.subjectName}</Text>
        {item.subjectCode && <Text style={styles.reqSubCode}>{item.subjectCode}</Text>}

        <View style={styles.reqChipRow}>
          <View style={styles.reqChip}>
            <Ionicons name="layers-outline" size={10} color="#64748b" />
            <Text style={styles.reqChipText}>Sem {item.semester}</Text>
          </View>
          {item.section && item.section !== "All" && (
            <View style={styles.reqChip}>
              <Ionicons name="people-outline" size={10} color="#64748b" />
              <Text style={styles.reqChipText}>Sec {item.section}</Text>
            </View>
          )}
          {item.admissionYear && (
            <View style={styles.reqChip}>
              <Ionicons name="calendar-outline" size={10} color="#64748b" />
              <Text style={styles.reqChipText}>Batch {item.admissionYear}</Text>
            </View>
          )}
        </View>

        {item.adminNote && (
          <Text style={[styles.reqNote, { color: sc.text }]}>💬 {item.adminNote}</Text>
        )}

        {item.status === "accepted" && (
          <View style={styles.acceptedActions}>
            {/* Schedule status */}
            {hasSchedule ? (
              <View style={styles.schedSetRow}>
                <Ionicons name="checkmark-circle" size={11} color="#a78bfa" />
                <Text style={styles.schedSetText}>Schedule set hai</Text>
              </View>
            ) : (
              <View style={styles.schedNotSetRow}>
                <Ionicons name="alert-circle-outline" size={11} color="#f59e0b" />
                <Text style={styles.schedNotSetText}>Schedule abhi set nahi — students ko timetable nahi dikhega</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Right side */}
      <View style={styles.reqRight}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
        </View>

        {item.status === "pending" && (
          <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
            <Ionicons name="trash-outline" size={13} color="#f87171" />
          </Pressable>
        )}

        {item.status === "accepted" && (
          <View style={styles.acceptedBtns}>
            <Pressable style={styles.schedBtnSmall} onPress={() => onSetSchedule(item)}>
              <Ionicons name="calendar-outline" size={12} color="#a78bfa" />
              <Text style={styles.schedBtnSmallText}>{hasSchedule ? "Edit" : "Schedule"}</Text>
            </Pressable>
            <Pressable style={styles.attendBtn} onPress={() => onAttendance(item)}>
              <Ionicons name="calendar" size={12} color="#34d399" />
              <Text style={styles.attendBtnText}>Attend</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════
export default function TeacherMySubjects() {
  const router = useRouter();

  const [tab,          setTab]          = useState("available");
  const [subjects,     setSubjects]     = useState([]);
  const [myRequests,   setMyRequests]   = useState([]);
  const [teacherInfo,  setTeacherInfo]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // scheduleMap: key = subjectId_admYear_sem → schedule object
  const [scheduleMap,  setScheduleMap]  = useState({});

  // Request modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selSubject,   setSelSubject]   = useState(null);
  const [semester,     setSemester]     = useState("");
  const [section,      setSection]      = useState("All");
  const [admYear,      setAdmYear]      = useState("");

  // Schedule modal state
  const [schedModal,   setSchedModal]   = useState(false);
  const [schedSubject, setSchedSubject] = useState(null);
  const [schedRequest, setSchedRequest] = useState(null);
  const [existingSched,setExistingSched]= useState(null);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [subRes, reqRes, schedRes] = await Promise.all([
        API.get("/subjects/for-teacher"),
        API.get("/subject-requests/my"),
        API.get("/subject-requests/teacher-timetable").catch(() => ({ data: { schedules: [] } })),
      ]);

      setSubjects(subRes.data?.subjects || []);
      setTeacherInfo(subRes.data?.teacher || null);
      setMyRequests(reqRes.data?.requests || []);

      // Build schedule map
      const schedules = schedRes.data?.schedules || [];
      const map = {};
      schedules.forEach(s => {
        const key = `${s.subjectId?._id || s.subjectId}_${s.admissionYear}_${s.semester}`;
        map[key] = s;
      });
      setScheduleMap(map);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const findRequest = (subject) => {
    if (!subject) return null;
    return myRequests.find(r =>
      r.subjectName === subject.name ||
      (r.subjectCode && subject.code && r.subjectCode === subject.code)
    ) || null;
  };

  // ── Open Request Modal ──
  const openModal = (subject) => {
    setSelSubject(subject);
    setSemester(String(subject.semester || ""));
    setSection("All");
    setAdmYear("");
    setModalVisible(true);
  };

  // ── Open Schedule Modal from Available tab ──
  const openScheduleFromSubject = (subject, request) => {
    const scheduleKey = `${subject._id}_${request?.admissionYear}_${request?.semester}`;
    setSchedSubject(subject);
    setSchedRequest(request);
    setExistingSched(scheduleMap[scheduleKey] || null);
    setSchedModal(true);
  };

  // ── Open Schedule Modal from Requests tab ──
  const openScheduleFromRequest = (request) => {
    // Find matching subject
    const subject = subjects.find(s =>
      s.name === request.subjectName ||
      (s.code && request.subjectCode && s.code === request.subjectCode)
    ) || {
      _id:        request.subjectId,
      name:       request.subjectName,
      code:       request.subjectCode,
      semester:   request.semester,
      college:    request.college,
      department: request.department,
    };

    const scheduleKey = `${request.subjectId || subject._id}_${request.admissionYear}_${request.semester}`;
    setSchedSubject(subject);
    setSchedRequest(request);
    setExistingSched(scheduleMap[scheduleKey] || null);
    setSchedModal(true);
  };

  // ── Send Request ──
  const handleSendRequest = async () => {
    if (!semester)            return Alert.alert("Error", "Semester select karo");
    if (!admYear)             return Alert.alert("Error", "Batch year required");
    if (admYear.length !== 4) return Alert.alert("Error", "4 digit year dalo (e.g. 2023)");
    try {
      setSending(true);
      await API.post("/subject-requests", {
        subjectId:     selSubject._id,
        subjectName:   selSubject.name,
        subjectCode:   selSubject.code || "",
        college:       selSubject.college || teacherInfo?.college || "",
        department:    selSubject.department || teacherInfo?.department || "",
        semester:      Number(semester),
        admissionYear: String(admYear),
        section,
      });
      setModalVisible(false);
      await loadAll();
      Alert.alert("✅ Request Sent!", "Admin ko request bhej di. Approval ke baad schedule set kar sakte ho.");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not send request");
    } finally {
      setSending(false);
    }
  };

  // ── Delete Request ──
  const handleDelete = (req) => {
    Alert.alert("Delete Request", `"${req.subjectName}" ki request delete karo?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/subject-requests/${req._id}`);
            setMyRequests(prev => prev.filter(r => r._id !== req._id));
          } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Could not delete");
          }
        },
      },
    ]);
  };

  const goAttendance = (req) => {
    router.push(`/teacher/mark-attendance?subjectRequestId=${req._id}`);
  };

  const pendingCount  = myRequests.filter(r => r.status === "pending").length;
  const acceptedCount = myRequests.filter(r => r.status === "accepted").length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Subjects</Text>
          {teacherInfo && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {teacherInfo.college} · {
                teacherInfo.department?.match(/\(([^)]+)\)/)?.[1] || teacherInfo.department?.split(" ")[0]
              }
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Info Banner */}
      {teacherInfo && (
        <View style={styles.infoBanner}>
          <Ionicons name="filter-outline" size={13} color="#f59e0b" />
          <Text style={styles.infoBannerText} numberOfLines={1}>
            Subjects for: <Text style={{ color:"#f59e0b", fontWeight:"700" }}>
              {teacherInfo.college}
            </Text> · <Text style={{ color:"#f59e0b", fontWeight:"700" }}>
              {teacherInfo.department?.match(/\(([^)]+)\)/)?.[1] || teacherInfo.department?.split(" ")[0]}
            </Text>
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, tab === "available" && styles.tabActive]} onPress={() => setTab("available")}>
          <Ionicons name="book-outline" size={14} color={tab === "available" ? "#00c6ff" : "#64748b"} />
          <Text style={[styles.tabText, tab === "available" && { color:"#00c6ff" }]}>
            Available ({subjects.length})
          </Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "requests" && styles.tabActive]} onPress={() => setTab("requests")}>
          <Ionicons name="paper-plane-outline" size={14} color={tab === "requests" ? "#a78bfa" : "#64748b"} />
          <Text style={[styles.tabText, tab === "requests" && { color:"#a78bfa" }]}>
            My Requests ({myRequests.length})
          </Text>
          {pendingCount > 0 && (
            <View style={styles.tabDot}>
              <Text style={styles.tabDotText}>{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>
      ) : (
        <>
          {/* AVAILABLE TAB */}
          {tab === "available" && (
            <FlatList
              data={subjects}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onRefresh={() => loadAll(true)}
              refreshing={refreshing}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="book-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>No Subjects Found</Text>
                  <Text style={styles.emptySub}>
                    Admin ne abhi tumhare college aur department ke liye subjects add nahi kiye.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <SubjectCard
                  item={item}
                  request={findRequest(item)}
                  scheduleMap={scheduleMap}
                  onRequest={openModal}
                  onSetSchedule={openScheduleFromSubject}
                />
              )}
            />
          )}

          {/* REQUESTS TAB */}
          {tab === "requests" && (
            <FlatList
              data={myRequests}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onRefresh={() => loadAll(true)}
              refreshing={refreshing}
              ListHeaderComponent={() =>
                acceptedCount > 0 ? (
                  <View style={[styles.listHeader, { borderColor:"rgba(52,211,153,0.3)", backgroundColor:"rgba(52,211,153,0.06)" }]}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#34d399" />
                    <Text style={[styles.listHeaderText, { color:"#34d399" }]}>
                      {acceptedCount} subject approved — Schedule set karke students ka timetable update karo!
                    </Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="paper-plane-outline" size={44} color="#374151" />
                  </View>
                  <Text style={styles.emptyTitle}>No Requests Yet</Text>
                  <Text style={styles.emptySub}>Available tab se kisi subject ka Request button tap karo.</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <RequestCard
                  item={item}
                  scheduleMap={scheduleMap}
                  onDelete={handleDelete}
                  onAttendance={goAttendance}
                  onSetSchedule={openScheduleFromRequest}
                />
              )}
            />
          )}
        </>
      )}

      {/* ── REQUEST MODAL ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="send-outline" size={18} color="#f59e0b" />
              <Text style={styles.modalTitle}>Request Subject Access</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal:20, paddingBottom:30 }}>
              {selSubject && (
                <View style={styles.selectedBox}>
                  <Ionicons name="book" size={15} color="#f59e0b" />
                  <View style={{ flex:1 }}>
                    <Text style={styles.selectedName}>{selSubject.name}</Text>
                    <Text style={styles.selectedMeta}>{selSubject.code} · Sem {selSubject.semester}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.fieldLabel}>Semester *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
                <View style={styles.chipRow}>
                  {SEMESTERS.map(s => (
                    <Pressable key={s} style={[styles.chip, semester === s && styles.chipActive]} onPress={() => setSemester(s)}>
                      <Text style={[styles.chipText, semester === s && { color:"#f59e0b" }]}>Sem {s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.fieldLabel}>Section</Text>
              <View style={[styles.chipRow, { marginBottom:16, flexWrap:"wrap" }]}>
                {SECTIONS.map(s => (
                  <Pressable key={s} style={[styles.chip, section === s && styles.chipActive]} onPress={() => setSection(s)}>
                    <Text style={[styles.chipText, section === s && { color:"#f59e0b" }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Batch Year (Admission Year) *</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2023"
                  placeholderTextColor="#374151"
                  value={admYear}
                  onChangeText={t => setAdmYear(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <Pressable style={[styles.sendBtn, sending && { opacity:0.65 }]} onPress={handleSendRequest} disabled={sending}>
                <LinearGradient colors={["#f59e0b","#d97706"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={styles.sendBtnGrad}>
                  {sending
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.sendBtnText}>Send Request to Admin</Text></>
                  }
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── SCHEDULE MODAL ── */}
      <ScheduleModal
        visible={schedModal}
        subject={schedSubject}
        request={schedRequest}
        existingSchedule={existingSched}
        onClose={() => setSchedModal(false)}
        onSaved={loadAll}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container:       { flex:1, backgroundColor:"#080d17" },
  center:          { flex:1, justifyContent:"center", alignItems:"center" },
  header:          { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:         { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:    { flex:1, alignItems:"center" },
  headerTitle:     { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:       { color:"#64748b", fontSize:11, marginTop:2 },
  infoBanner:      { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,158,11,0.08)", marginHorizontal:16, marginTop:8, padding:10, borderRadius:12, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  infoBannerText:  { flex:1, color:"#94a3b8", fontSize:11 },
  tabRow:          { flexDirection:"row", borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)", marginTop:8 },
  tab:             { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:13 },
  tabActive:       { borderBottomWidth:2, borderBottomColor:"#f59e0b" },
  tabText:         { color:"#64748b", fontSize:12, fontWeight:"700" },
  tabDot:          { backgroundColor:"#f59e0b", borderRadius:10, paddingHorizontal:5, paddingVertical:1 },
  tabDotText:      { color:"#000", fontSize:9, fontWeight:"800" },
  list:            { padding:16, paddingBottom:30 },
  listHeader:      { flexDirection:"row", alignItems:"flex-start", gap:8, padding:12, borderRadius:12, borderWidth:1, marginBottom:14 },
  listHeaderText:  { color:"#64748b", fontSize:11, flex:1, lineHeight:16 },

  // Subject card
  subCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.06)", gap:10 },
  subIconWrap:     { width:46, height:46, borderRadius:13, justifyContent:"center", alignItems:"center" },
  subInfo:         { flex:1 },
  subName:         { color:"#fff", fontSize:14, fontWeight:"700", marginBottom:5 },
  subBadgeRow:     { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:5 },
  codeBadge:       { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  codeBadgeText:   { fontSize:10, fontWeight:"800" },
  semBadge:        { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  semBadgeText:    { fontSize:10, fontWeight:"700" },
  typeBadge:       { paddingHorizontal:8, paddingVertical:2, borderRadius:6 },
  typeBadgeText:   { fontSize:10, fontWeight:"700" },
  subMetaRow:      { flexDirection:"row", alignItems:"center", gap:4 },
  subMetaText:     { color:"#64748b", fontSize:10 },
  subDot:          { color:"#374151", fontSize:10 },
  schedSetRow:     { flexDirection:"row", alignItems:"center", gap:4, marginTop:5 },
  schedSetText:    { color:"#a78bfa", fontSize:10, fontWeight:"600" },
  schedNotSetRow:  { flexDirection:"row", alignItems:"center", gap:4, marginTop:5 },
  schedNotSetText: { color:"#f59e0b", fontSize:10 },
  subAction:       { alignItems:"center", gap:6 },
  scheduleBtn:     { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(167,139,250,0.12)", paddingHorizontal:10, paddingVertical:7, borderRadius:8, borderWidth:1, borderColor:"rgba(167,139,250,0.3)" },
  scheduleBtnText: { color:"#a78bfa", fontSize:10, fontWeight:"700" },
  acceptedPill:    { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(52,211,153,0.12)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(52,211,153,0.3)" },
  acceptedPillText:{ color:"#34d399", fontSize:10, fontWeight:"700" },
  pendingPill:     { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(245,158,11,0.12)", paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  pendingPillText: { color:"#f59e0b", fontSize:10, fontWeight:"700" },
  requestBtn:      { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(245,158,11,0.85)", paddingHorizontal:10, paddingVertical:8, borderRadius:10 },
  requestBtnText:  { color:"#fff", fontSize:10, fontWeight:"800" },

  // Request card
  reqCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"#1a2535", borderRadius:14, marginBottom:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  reqAccent:       { width:3, alignSelf:"stretch" },
  reqBody:         { flex:1, padding:12 },
  reqSubName:      { color:"#fff", fontSize:14, fontWeight:"700" },
  reqSubCode:      { color:"#64748b", fontSize:11, marginTop:1, marginBottom:5 },
  reqChipRow:      { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:5 },
  reqChip:         { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  reqChipText:     { color:"#64748b", fontSize:10 },
  reqNote:         { fontSize:11, fontStyle:"italic", marginTop:4 },
  acceptedActions: { marginTop:6 },
  reqRight:        { paddingRight:10, alignItems:"center", gap:6 },
  statusBadge:     { paddingHorizontal:8, paddingVertical:4, borderRadius:8, borderWidth:1 },
  statusText:      { fontSize:10, fontWeight:"700" },
  deleteBtn:       { width:30, height:30, borderRadius:8, backgroundColor:"rgba(248,113,113,0.12)", justifyContent:"center", alignItems:"center" },
  acceptedBtns:    { gap:6, alignItems:"center" },
  schedBtnSmall:   { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(167,139,250,0.12)", paddingHorizontal:8, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:"rgba(167,139,250,0.25)" },
  schedBtnSmallText:{ color:"#a78bfa", fontSize:10, fontWeight:"700" },
  attendBtn:       { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(52,211,153,0.12)", paddingHorizontal:8, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  attendBtnText:   { color:"#34d399", fontSize:10, fontWeight:"700" },

  empty:           { alignItems:"center", paddingTop:70, gap:12, paddingHorizontal:20 },
  emptyIconWrap:   { width:80, height:80, borderRadius:40, backgroundColor:"#1a2535", justifyContent:"center", alignItems:"center" },
  emptyTitle:      { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:        { color:"#1f2937", fontSize:12, textAlign:"center", lineHeight:18 },

  // Request Modal
  modalOverlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.78)", justifyContent:"flex-end" },
  modalSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.85, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  modalHandle:     { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
  modalHeader:     { flexDirection:"row", alignItems:"center", gap:10, padding:20, paddingBottom:12 },
  modalTitle:      { flex:1, color:"#fff", fontSize:17, fontWeight:"800" },
  selectedBox:     { flexDirection:"row", alignItems:"flex-start", gap:10, backgroundColor:"rgba(245,158,11,0.08)", borderRadius:14, padding:14, marginBottom:18, borderWidth:1, borderColor:"rgba(245,158,11,0.2)" },
  selectedName:    { color:"#fff", fontSize:14, fontWeight:"700" },
  selectedMeta:    { color:"#64748b", fontSize:11, marginTop:2 },
  fieldLabel:      { color:"#64748b", fontSize:11, fontWeight:"700", letterSpacing:0.5, marginBottom:8 },
  chipRow:         { flexDirection:"row", gap:8 },
  chip:            { paddingHorizontal:14, paddingVertical:8, borderRadius:10, backgroundColor:"rgba(255,255,255,0.06)", borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  chipActive:      { backgroundColor:"rgba(245,158,11,0.15)", borderColor:"#f59e0b" },
  chipText:        { color:"#64748b", fontSize:12, fontWeight:"700" },
  inputRow:        { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:12, paddingHorizontal:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginBottom:20 },
  input:           { flex:1, color:"#fff", fontSize:15, paddingVertical:14 },
  sendBtn:         { borderRadius:14, overflow:"hidden" },
  sendBtnGrad:     { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  sendBtnText:     { color:"#fff", fontWeight:"700", fontSize:15 },

  // Schedule Modal
  schedSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.92, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  schedHeader:     { flexDirection:"row", alignItems:"center", justifyContent:"space-between", padding:20, paddingBottom:10 },
  schedHeaderLeft: { flexDirection:"row", alignItems:"center", gap:10, flex:1 },
  schedTitle:      { color:"#fff", fontSize:16, fontWeight:"800" },
  schedSub:        { color:"#64748b", fontSize:11, marginTop:1 },
  schedCloseBtn:   { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  schedInfoRow:    { flexDirection:"row", flexWrap:"wrap", gap:8, paddingHorizontal:20, paddingBottom:10 },
  schedInfoChip:   { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  schedInfoText:   { color:"#64748b", fontSize:11, fontWeight:"600" },
  dayTabsScroll:   { borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)", maxHeight:52 },
  dayTabsContent:  { paddingHorizontal:16, gap:8, paddingVertical:10, alignItems:"center" },
  dayTab:          { paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", flexDirection:"row", alignItems:"center", gap:5 },
  dayTabText:      { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayTabDot:       { width:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center" },
  dayTabDotText:   { color:"#000", fontSize:9, fontWeight:"800" },
  schedBody:       { padding:16, paddingBottom:30 },
  activeDayRow:    { flexDirection:"row", alignItems:"center", gap:8, marginBottom:12 },
  activeDayDot:    { width:8, height:8, borderRadius:4 },
  activeDayText:   { fontSize:14, fontWeight:"800" },
  activeDayHint:   { color:"#374151", fontSize:11 },
  slotsGrid:       { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  slotChip:        { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:9, borderRadius:10, backgroundColor:"rgba(255,255,255,0.05)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  slotChipText:    { color:"#64748b", fontSize:12, fontWeight:"600" },
  roomSection:     { backgroundColor:"rgba(255,255,255,0.04)", borderRadius:14, padding:14, marginBottom:14, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomSectionTitle:{ color:"#94a3b8", fontSize:12, fontWeight:"700", marginBottom:10 },
  roomInputRow:    { flexDirection:"row", alignItems:"center", gap:10, marginBottom:8 },
  roomTimeTag:     { paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  roomTimeText:    { fontSize:11, fontWeight:"700" },
  roomInput:       { flex:1, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:8, paddingHorizontal:12, paddingVertical:8, color:"#fff", fontSize:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  slotSummary:     { backgroundColor:"rgba(167,139,250,0.08)", borderRadius:14, padding:14, marginBottom:16, borderWidth:1, borderColor:"rgba(167,139,250,0.2)" },
  slotSummaryHeader:{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  slotSummaryTitle:{ color:"#a78bfa", fontSize:13, fontWeight:"700" },
  summaryDayRow:   { flexDirection:"row", alignItems:"center", gap:8, marginBottom:6 },
  summaryDayName:  { fontSize:11, fontWeight:"800", width:34 },
  summarySlots:    { flexDirection:"row", flexWrap:"wrap", gap:6, flex:1 },
  summarySlotBadge:{ paddingHorizontal:10, paddingVertical:4, borderRadius:8 },
  summarySlotText: { fontSize:10, fontWeight:"700" },
  saveSchedBtn:    { borderRadius:14, overflow:"hidden", marginTop:4 },
  saveSchedGrad:   { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  saveSchedText:   { color:"#fff", fontWeight:"800", fontSize:16 },
});