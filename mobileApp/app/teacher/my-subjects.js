// app/teacher/my-subjects.js
// Teacher ke 3 tabs:
// 1. ASSIGNED   — admin ne accept kiye + timetable assign kiya (most important)
// 2. AVAILABLE  — same college+dept ke subjects — request bhej sako
// 3. REQUESTS   — pending/rejected/accepted request status

import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, Dimensions, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SECTIONS  = ["All","A","B","C","D"];
const YEARS     = ["2020","2021","2022","2023","2024","2025","2026"];
const DAY_COLORS = {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c",
};
const TYPE_COLORS = { Theory:"#00c6ff", Lab:"#34d399", Both:"#a78bfa" };
const STATUS_C = {
  pending:  { bg:"rgba(245,158,11,0.15)",  text:"#f59e0b" },
  accepted: { bg:"rgba(52,211,153,0.15)",  text:"#34d399" },
  rejected: { bg:"rgba(248,113,113,0.15)", text:"#f87171" },
};

// Time slots 8AM - 6PM
const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push({
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
    label:     `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM" : "AM"}`,
  });
}

const deptColor = (dept="") => {
  const map = { CSE:"#00c6ff", ECE:"#a78bfa", ME:"#f59e0b", CE:"#34d399", IT:"#f87171", EEE:"#60a5fa" };
  const k = Object.keys(map).find(k => dept.toUpperCase().includes(k));
  return map[k] || "#64748b";
};

// ── Request modal (send new request) ─────────────────────
const RequestModal = ({ visible, subject, teacherInfo, onClose, onSent }) => {
  const [semester,      setSemester]      = useState("1");
  const [admissionYear, setAdmissionYear] = useState(new Date().getFullYear().toString());
  const [section,       setSection]       = useState("All");
  const [sending,       setSending]       = useState(false);

  const SEMESTERS = ["1","2","3","4","5","6","7","8"];

  const send = async () => {
    if (!subject) return;
    setSending(true);
    try {
      await API.post("/subject-requests", {
        subjectId:     subject._id,
        subjectName:   subject.name,
        subjectCode:   subject.code || "",
        college:       teacherInfo?.college || subject.college,
        department:    subject.department,
        semester:      Number(semester),
        admissionYear: String(admissionYear),
        section,
      });
      Alert.alert("Request Sent! ✅", `Your request for "${subject.name}" has been sent to admin.`);
      onSent?.();
      onClose();
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not send request");
    } finally {
      setSending(false);
    }
  };

  if (!subject) return null;
  const tc = TYPE_COLORS[subject.type] || "#64748b";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          {/* Subject info */}
          <View style={s.sheetHeader}>
            <View style={[s.sheetIcon, { backgroundColor: tc + "22" }]}>
              <Ionicons name="book" size={20} color={tc} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle} numberOfLines={1}>{subject.name}</Text>
              <Text style={s.sheetSub}>{subject.code} · {subject.type}</Text>
            </View>
            <Pressable onPress={onClose} style={s.sheetClose}>
              <Ionicons name="close" size={18} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {/* Semester */}
            <Text style={s.fieldLabel}>SEMESTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {SEMESTERS.map(sem => (
                <Pressable key={sem} onPress={() => setSemester(sem)}
                  style={[s.chip, semester === sem && { backgroundColor: "rgba(0,198,255,0.2)", borderColor: "#00c6ff" }]}>
                  <Text style={[s.chipText, semester === sem && { color: "#00c6ff" }]}>Sem {sem}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Admission Year */}
            <Text style={s.fieldLabel}>BATCH / ADMISSION YEAR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {YEARS.map(y => (
                <Pressable key={y} onPress={() => setAdmissionYear(y)}
                  style={[s.chip, admissionYear === y && { backgroundColor: "rgba(52,211,153,0.2)", borderColor: "#34d399" }]}>
                  <Text style={[s.chipText, admissionYear === y && { color: "#34d399" }]}>{y}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Section */}
            <Text style={s.fieldLabel}>SECTION</Text>
            <View style={{ flexDirection: "row", gap: 8, paddingVertical: 6, flexWrap: "wrap" }}>
              {SECTIONS.map(sec => (
                <Pressable key={sec} onPress={() => setSection(sec)}
                  style={[s.chip, section === sec && { backgroundColor: "rgba(167,139,250,0.2)", borderColor: "#a78bfa" }]}>
                  <Text style={[s.chipText, section === sec && { color: "#a78bfa" }]}>
                    {sec === "All" ? "All Sections" : `Section ${sec}`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Summary */}
            <View style={s.summaryBox}>
              <Ionicons name="information-circle-outline" size={14} color="#60a5fa" />
              <Text style={s.summaryText}>
                Requesting to teach {subject.name} for Sem {semester} · Batch {admissionYear} · {section === "All" ? "All Sections" : `Section ${section}`}
              </Text>
            </View>

            <Pressable style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={send} disabled={sending}>
              <LinearGradient colors={["#0072ff", "#00c6ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sendBtnGrad}>
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="paper-plane" size={16} color="#fff" /><Text style={s.sendBtnText}>Send Request to Admin</Text></>
                }
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Assigned subject card ─────────────────────────────────
const AssignedCard = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const tc = TYPE_COLORS[item.subjectType] || "#64748b";
  const dc = deptColor(item.department);
  const slots = item.timetable || [];

  return (
    <Pressable style={[s.assignedCard, { borderLeftColor: tc }]} onPress={() => setExpanded(!expanded)}>
      {/* Header row */}
      <View style={s.assignedHeader}>
        <View style={[s.assignedIconBox, { backgroundColor: tc + "20" }]}>
          <Ionicons name={item.subjectType === "Lab" ? "flask" : "book"} size={18} color={tc} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.assignedName} numberOfLines={1}>{item.subjectName}</Text>
          {item.subjectCode ? <Text style={s.assignedCode}>{item.subjectCode}</Text> : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[s.typeBadge, { backgroundColor: tc + "20" }]}>
            <Text style={[s.typeBadgeText, { color: tc }]}>{item.subjectType || "Theory"}</Text>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#374151" />
        </View>
      </View>

      {/* Meta row */}
      <View style={s.assignedMeta}>
        <View style={[s.metaChip, { backgroundColor: dc + "18" }]}>
          <Text style={[s.metaChipText, { color: dc }]}>
            {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]} {item.admissionYear}
          </Text>
        </View>
        <View style={s.metaChip}>
          <Text style={s.metaChipText}>Sem {item.semester}</Text>
        </View>
        {item.section && item.section !== "All" && (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>Sec {item.section}</Text>
          </View>
        )}
        <View style={[s.metaChip, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
          <Ionicons name="checkmark-circle" size={10} color="#34d399" />
          <Text style={[s.metaChipText, { color: "#34d399" }]}>Assigned</Text>
        </View>
      </View>

      {/* Timetable — show when expanded */}
      {expanded && (
        <View style={s.timetableBox}>
          <Text style={s.timetableTitle}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" /> Timetable
          </Text>
          {slots.length === 0 ? (
            <Text style={s.noSlots}>No timetable assigned yet. Contact admin.</Text>
          ) : (
            slots.map((slot, i) => {
              const dc2 = DAY_COLORS[slot.day] || "#64748b";
              return (
                <View key={i} style={s.slotRow}>
                  <View style={[s.slotDay, { backgroundColor: dc2 + "20" }]}>
                    <Text style={[s.slotDayText, { color: dc2 }]}>{slot.day?.slice(0, 3)}</Text>
                  </View>
                  <Text style={s.slotTime}>{slot.startTime} — {slot.endTime}</Text>
                  {slot.room ? (
                    <View style={s.slotRoom}>
                      <Ionicons name="location-outline" size={10} color="#64748b" />
                      <Text style={s.slotRoomText}>{slot.room}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}
    </Pressable>
  );
};

// ── Available subject card ────────────────────────────────
const AvailableCard = ({ item, hasRequest, onRequest }) => {
  const tc = TYPE_COLORS[item.type] || "#64748b";
  const dc = deptColor(item.department);
  const req = hasRequest;
  const sc = req ? STATUS_C[req.status] : null;

  return (
    <View style={[s.availCard, req?.status === "accepted" && { borderColor: "rgba(52,211,153,0.3)" }]}>
      <View style={s.availHeader}>
        <View style={[s.availIconBox, { backgroundColor: tc + "18" }]}>
          <Ionicons name={item.type === "Lab" ? "flask-outline" : "book-outline"} size={18} color={tc} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.availName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.availCode}>{item.code || "—"}</Text>
        </View>
        <View style={[s.typeBadge, { backgroundColor: tc + "20" }]}>
          <Text style={[s.typeBadgeText, { color: tc }]}>{item.type}</Text>
        </View>
      </View>

      <View style={s.availMeta}>
        <View style={[s.metaChip, { backgroundColor: dc + "18" }]}>
          <Text style={[s.metaChipText, { color: dc }]}>
            {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]}
          </Text>
        </View>
        <View style={s.metaChip}>
          <Text style={s.metaChipText}>Sem {item.semester}</Text>
        </View>
        {item.credits ? (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>{item.credits} credits</Text>
          </View>
        ) : null}
      </View>

      {/* Status or Request button */}
      {req ? (
        <View style={[s.statusRow, { backgroundColor: sc.bg }]}>
          <Ionicons
            name={req.status === "accepted" ? "checkmark-circle" : req.status === "rejected" ? "close-circle" : "time"}
            size={13}
            color={sc.text}
          />
          <Text style={[s.statusText, { color: sc.text }]}>
            {req.status === "accepted"
              ? `Accepted · Sem ${req.semester} · Batch ${req.admissionYear}`
              : req.status === "rejected"
              ? "Request Rejected"
              : `Pending Review · Sem ${req.semester}`
            }
          </Text>
        </View>
      ) : (
        <Pressable style={s.requestBtn} onPress={() => onRequest(item)}>
          <Ionicons name="paper-plane-outline" size={14} color="#00c6ff" />
          <Text style={s.requestBtnText}>Send Request to Admin</Text>
        </Pressable>
      )}
    </View>
  );
};

// ── Request status card ───────────────────────────────────
const RequestCard = ({ item, onDelete }) => {
  const sc = STATUS_C[item.status] || STATUS_C.pending;
  const dc = deptColor(item.department);
  const hasSlots = item.timetable?.length > 0;

  return (
    <View style={[s.reqCard, { borderLeftColor: sc.text }]}>
      <View style={s.reqHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.reqName} numberOfLines={1}>{item.subjectName}</Text>
          <Text style={s.reqCode}>{item.subjectCode || "—"}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
          <Text style={[s.statusPillText, { color: sc.text }]}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={s.reqMeta}>
        <View style={[s.metaChip, { backgroundColor: dc + "18" }]}>
          <Text style={[s.metaChipText, { color: dc }]}>
            {item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0]} {item.admissionYear}
          </Text>
        </View>
        <View style={s.metaChip}>
          <Text style={s.metaChipText}>Sem {item.semester}</Text>
        </View>
        {item.section && item.section !== "All" && (
          <View style={s.metaChip}>
            <Text style={s.metaChipText}>Sec {item.section}</Text>
          </View>
        )}
      </View>

      {/* Admin note */}
      {item.adminNote ? (
        <View style={s.noteBox}>
          <Ionicons name="chatbubble-outline" size={12} color="#60a5fa" />
          <Text style={s.noteText}>{item.adminNote}</Text>
        </View>
      ) : null}

      {/* Timetable if accepted */}
      {item.status === "accepted" && hasSlots && (
        <View style={s.reqSlots}>
          {item.timetable.map((slot, i) => {
            const dc2 = DAY_COLORS[slot.day] || "#64748b";
            return (
              <View key={i} style={s.reqSlotChip}>
                <Text style={[s.reqSlotDay, { color: dc2 }]}>{slot.day?.slice(0, 3)}</Text>
                <Text style={s.reqSlotTime}>{slot.startTime}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Delete pending */}
      {item.status === "pending" && (
        <Pressable style={s.deleteBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={13} color="#f87171" />
          <Text style={s.deleteBtnText}>Cancel Request</Text>
        </Pressable>
      )}
    </View>
  );
};

// ════════════════════════════════════════════════════════
export default function TeacherMySubjects() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [tab,          setTab]          = useState("assigned");  // assigned | available | requests
  const [assigned,     setAssigned]     = useState([]);          // accepted from admin
  const [available,    setAvailable]    = useState([]);          // subjects to request
  const [requests,     setRequests]     = useState([]);          // all my requests
  const [teacherInfo,  setTeacherInfo]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [reqModal,     setReqModal]     = useState(false);
  const [selSubject,   setSelSubject]   = useState(null);

  useFocusEffect(useCallback(() => {
    loadAll();
  }, []));

  const loadAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [assignedRes, availRes, reqRes] = await Promise.allSettled([
  API.get("/subject-requests/my-subjects"),
  API.get("/subject-requests/available-subjects"),
  API.get("/subject-requests/my"),
]);

      if (assignedRes.status === "fulfilled") {
        setAssigned(assignedRes.value.data?.subjects || []);
      }
      if (availRes.status === "fulfilled") {
        setAvailable(availRes.value.data?.subjects || []);
        setTeacherInfo(availRes.value.data?.teacher || null);
      }
      if (reqRes.status === "fulfilled") {
        setRequests(reqRes.value.data?.requests || []);
      }
    } catch (e) {
      console.log("Load error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteRequest = (req) => {
    Alert.alert("Cancel Request", `Cancel request for "${req.subjectName}"?`, [
      { text: "Keep", style: "cancel" },
      { text: "Cancel Request", style: "destructive", onPress: async () => {
        try {
          await API.delete(`/subject-requests/${req._id}`);
          setRequests(prev => prev.filter(r => r._id !== req._id));
        } catch (e) {
          Alert.alert("Error", e.response?.data?.message || "Could not cancel");
        }
      }},
    ]);
  };

  // Find if a subject already has a request
  const findRequest = (subject) =>
    requests.find(r => r.subjectName === subject.name || r.subjectId === subject._id);

  const pendingCount  = requests.filter(r => r.status === "pending").length;
  const acceptedCount = assigned.length;

  const TABS = [
    { key: "assigned",  label: "Assigned",  icon: "checkmark-circle-outline", color: "#34d399", count: acceptedCount },
    { key: "available", label: "Available", icon: "book-outline",              color: "#00c6ff", count: available.length },
    { key: "requests",  label: "Requests",  icon: "paper-plane-outline",       color: "#a78bfa", count: requests.length, badge: pendingCount },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      {/* Header */}
      <LinearGradient colors={["#080d17", "#0f1923"]} style={[s.header, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={s.headerCtr}>
          <Text style={s.headerTitle}>My Subjects</Text>
          <Text style={s.headerSub}>
            {teacherInfo
              ? `${teacherInfo.department?.match(/\(([^)]+)\)/)?.[1] || teacherInfo.department?.split(" ")[0] || ""} · ${teacherInfo.college?.split(" ")[0] || ""}`
              : "Loading..."}
          </Text>
        </View>
        <Pressable onPress={() => loadAll(true)} style={s.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#00c6ff" />
        </Pressable>
      </LinearGradient>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map(t => {
          const on = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[s.tabBtn, on && { borderBottomColor: t.color, borderBottomWidth: 2.5 }]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={on ? t.color : "#374151"} />
              <Text style={[s.tabText, on && { color: t.color }]}>{t.label}</Text>
              <View style={[s.tabCount, on && { backgroundColor: t.color + "25" }]}>
                <Text style={[s.tabCountText, on && { color: t.color }]}>{t.count}</Text>
              </View>
              {t.badge > 0 && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeText}>{t.badge}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#00c6ff" />
          <Text style={s.loadingText}>Loading subjects...</Text>
        </View>
      ) : (

        // ── ASSIGNED TAB ────────────────────────────────────
        tab === "assigned" ? (
          <FlatList
            data={assigned}
            keyExtractor={(item, i) => item._id + i}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#34d399" />}
            ListHeaderComponent={() => (
              <View style={s.tabInfo}>
                <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                <Text style={s.tabInfoText}>
                  {assigned.length > 0
                    ? `${assigned.length} subject${assigned.length > 1 ? "s" : ""} assigned by admin with timetable`
                    : "No subjects assigned yet. Request subjects from Available tab."}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="book-outline" size={40} color="#374151" />
                </View>
                <Text style={s.emptyTitle}>No Assigned Subjects</Text>
                <Text style={s.emptySub}>Admin has not assigned any subjects to you yet.</Text>
                <Pressable style={s.emptyBtn} onPress={() => setTab("available")}>
                  <Text style={s.emptyBtnText}>Browse Available Subjects →</Text>
                </Pressable>
              </View>
            )}
            renderItem={({ item }) => <AssignedCard item={item} />}
          />
        ) :

        // ── AVAILABLE TAB ───────────────────────────────────
        tab === "available" ? (
          <FlatList
            data={available}
            keyExtractor={item => item._id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#00c6ff" />}
            ListHeaderComponent={() => (
              <View style={s.tabInfo}>
                <Ionicons name="information-circle-outline" size={14} color="#60a5fa" />
                <Text style={s.tabInfoText}>
                  Subjects from your department. Send a request to admin to get assigned.
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="search-outline" size={40} color="#374151" />
                </View>
                <Text style={s.emptyTitle}>No Subjects Found</Text>
                <Text style={s.emptySub}>No subjects added for your department yet.</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <AvailableCard
                item={item}
                hasRequest={findRequest(item)}
                onRequest={(sub) => { setSelSubject(sub); setReqModal(true); }}
              />
            )}
          />
        ) :

        // ── REQUESTS TAB ────────────────────────────────────
        (
          <FlatList
            data={requests}
            keyExtractor={item => item._id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#a78bfa" />}
            ListHeaderComponent={() => (
              <View style={s.reqSummaryRow}>
                {[
                  { label: "Pending",  n: requests.filter(r => r.status === "pending").length,  color: "#f59e0b" },
                  { label: "Accepted", n: requests.filter(r => r.status === "accepted").length, color: "#34d399" },
                  { label: "Rejected", n: requests.filter(r => r.status === "rejected").length, color: "#f87171" },
                ].map((x, i) => (
                  <View key={i} style={[s.reqStat, { backgroundColor: x.color + "15" }]}>
                    <Text style={[s.reqStatNum, { color: x.color }]}>{x.n}</Text>
                    <Text style={s.reqStatLabel}>{x.label}</Text>
                  </View>
                ))}
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Ionicons name="paper-plane-outline" size={40} color="#374151" />
                </View>
                <Text style={s.emptyTitle}>No Requests Yet</Text>
                <Text style={s.emptySub}>Go to Available tab to send subject requests to admin.</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <RequestCard item={item} onDelete={deleteRequest} />
            )}
          />
        )
      )}

      {/* Request modal */}
      <RequestModal
        visible={reqModal}
        subject={selSubject}
        teacherInfo={teacherInfo}
        onClose={() => { setReqModal(false); setSelSubject(null); }}
        onSent={loadAll}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#080d17" },
  center:           { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:      { color: "#374151", fontSize: 13 },

  // Header
  header:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  backBtn:          { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", justifyContent: "center", alignItems: "center" },
  headerCtr:        { flex: 1, alignItems: "center" },
  headerTitle:      { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub:        { color: "#374151", fontSize: 11, marginTop: 2 },
  refreshBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(0,198,255,0.1)", justifyContent: "center", alignItems: "center" },

  // Tab bar
  tabBar:           { flexDirection: "row", backgroundColor: "#0f1923", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  tabBtn:           { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, borderBottomColor: "transparent", borderBottomWidth: 2.5, position: "relative" },
  tabText:          { color: "#374151", fontSize: 11, fontWeight: "700" },
  tabCount:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)" },
  tabCountText:     { color: "#374151", fontSize: 10, fontWeight: "800" },
  tabBadge:         { position: "absolute", top: 6, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#f59e0b", justifyContent: "center", alignItems: "center" },
  tabBadgeText:     { color: "#000", fontSize: 9, fontWeight: "900" },

  list:             { padding: 16, paddingBottom: 40 },
  tabInfo:          { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(96,165,250,0.15)" },
  tabInfoText:      { color: "#60a5fa", fontSize: 12, flex: 1, lineHeight: 18 },

  // Assigned card
  assignedCard:     { backgroundColor: "#0f1b2d", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderLeftWidth: 4 },
  assignedHeader:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  assignedIconBox:  { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  assignedName:     { color: "#fff", fontSize: 14, fontWeight: "700" },
  assignedCode:     { color: "#64748b", fontSize: 11, marginTop: 2 },
  assignedMeta:     { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 6 },
  timetableBox:     { marginTop: 10, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  timetableTitle:   { color: "#64748b", fontSize: 11, fontWeight: "700", marginBottom: 8 },
  noSlots:          { color: "#374151", fontSize: 12, fontStyle: "italic" },
  slotRow:          { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  slotDay:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  slotDayText:      { fontSize: 11, fontWeight: "700" },
  slotTime:         { color: "#94a3b8", fontSize: 12, flex: 1 },
  slotRoom:         { flexDirection: "row", alignItems: "center", gap: 3 },
  slotRoomText:     { color: "#374151", fontSize: 11 },

  // Available card
  availCard:        { backgroundColor: "#0f1b2d", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  availHeader:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  availIconBox:     { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  availName:        { color: "#fff", fontSize: 14, fontWeight: "700" },
  availCode:        { color: "#64748b", fontSize: 11, marginTop: 2 },
  availMeta:        { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  statusRow:        { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  statusText:       { fontSize: 12, fontWeight: "600" },
  requestBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(0,198,255,0.1)", padding: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  requestBtnText:   { color: "#00c6ff", fontSize: 13, fontWeight: "700" },

  // Request card
  reqCard:          { backgroundColor: "#0f1b2d", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderLeftWidth: 4 },
  reqHeader:        { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  reqName:          { color: "#fff", fontSize: 14, fontWeight: "700" },
  reqCode:          { color: "#64748b", fontSize: 11, marginTop: 2 },
  reqMeta:          { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  statusPill:       { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusPillText:   { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  noteBox:          { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "rgba(96,165,250,0.2)" },
  noteText:         { color: "#60a5fa", fontSize: 12, flex: 1, lineHeight: 17 },
  reqSlots:         { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  reqSlotChip:      { backgroundColor: "rgba(52,211,153,0.12)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignItems: "center" },
  reqSlotDay:       { fontSize: 10, fontWeight: "800" },
  reqSlotTime:      { color: "#94a3b8", fontSize: 10, marginTop: 1 },
  deleteBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(248,113,113,0.08)", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  deleteBtnText:    { color: "#f87171", fontSize: 12, fontWeight: "600" },

  // Request summary stats
  reqSummaryRow:    { flexDirection: "row", gap: 10, marginBottom: 14 },
  reqStat:          { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  reqStatNum:       { fontSize: 20, fontWeight: "900" },
  reqStatLabel:     { color: "#64748b", fontSize: 10, fontWeight: "600", marginTop: 2 },

  // Shared chips
  metaChip:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  metaChipText:     { fontSize: 10, fontWeight: "700", color: "#64748b" },
  typeBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  typeBadgeText:    { fontSize: 10, fontWeight: "800" },

  // Empty state
  empty:            { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon:        { width: 76, height: 76, borderRadius: 38, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle:       { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub:         { color: "#1f2937", fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  emptyBtn:         { marginTop: 8, backgroundColor: "rgba(0,198,255,0.1)", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,198,255,0.25)" },
  emptyBtnText:     { color: "#00c6ff", fontWeight: "700", fontSize: 13 },

  // Request modal
  overlay:          { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet:            { backgroundColor: "#0f1923", borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "88%", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  sheetHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  sheetIcon:        { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  sheetTitle:       { color: "#fff", fontSize: 15, fontWeight: "800" },
  sheetSub:         { color: "#64748b", fontSize: 12, marginTop: 2 },
  sheetClose:       { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  fieldLabel:       { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  chip:             { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  chipText:         { color: "#64748b", fontSize: 12, fontWeight: "600" },
  summaryBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 4, borderWidth: 1, borderColor: "rgba(96,165,250,0.2)" },
  summaryText:      { color: "#60a5fa", fontSize: 12, flex: 1, lineHeight: 18 },
  sendBtn:          { borderRadius: 14, overflow: "hidden", marginTop: 16 },
  sendBtnGrad:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  sendBtnText:      { color: "#fff", fontWeight: "700", fontSize: 15 },
});