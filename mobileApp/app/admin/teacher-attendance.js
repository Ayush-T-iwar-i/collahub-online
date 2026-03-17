// app/admin/teacher-attendance.js
// Teacher Biometric Gate Attendance — same college only

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, TextInput, StatusBar,
  ScrollView, RefreshControl, Modal, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

// ── Helpers ──────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};
const today = () => new Date().toISOString().split("T")[0];
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

// ── Stat Card ────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <LinearGradient
    colors={[color + "18", color + "06"]}
    style={[styles.statCard, { borderColor: color + "30" }]}
  >
    <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={17} color={color} />
    </View>
    <Text style={[styles.statVal, { color }]}>{value ?? "—"}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </LinearGradient>
);

// ── Teacher Row ───────────────────────────────────────────
const TeacherRow = ({ item, onPress }) => {
  const isIn = item.lastPunch?.punchType === "CheckIn";
  const statusColor = !item.lastPunch ? "#374151"
    : isIn ? "#34d399" : "#f87171";
  const statusText = !item.lastPunch ? "No Punch"
    : isIn ? "Checked In" : "Checked Out";

  return (
    <Pressable style={styles.teacherRow} onPress={() => onPress(item)}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.avatarText, { color: statusColor }]}>
          {initials(item.name)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.teacherMeta} numberOfLines={1}>
          {item.department || "—"} · {item.teacherId || item.email}
        </Text>
        {item.lastPunch && (
          <Text style={styles.teacherTime}>
            Last punch: {fmtTime(item.lastPunch.punchTime)}
          </Text>
        )}
      </View>

      {/* Status */}
      <View style={styles.teacherRight}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "40" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Text style={styles.punchCount}>{item.todayPunches || 0} punches</Text>
        <Ionicons name="chevron-forward" size={14} color="#374151" />
      </View>
    </Pressable>
  );
};

// ── Punch Log Row ─────────────────────────────────────────
const PunchRow = ({ item, index }) => {
  const isIn = item.punchType === "CheckIn";
  const color = isIn ? "#34d399" : "#f87171";
  return (
    <View style={[styles.punchRow, index > 0 && { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" }]}>
      <View style={[styles.punchIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={isIn ? "enter-outline" : "exit-outline"} size={14} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.punchType, { color }]}>{isIn ? "Check In" : "Check Out"}</Text>
        <Text style={styles.punchDate}>{fmtDate(item.punchTime)}</Text>
      </View>
      <View style={styles.punchRight}>
        <Text style={styles.punchTime}>{fmtTime(item.punchTime)}</Text>
        <View style={[styles.modeBadge, {
          backgroundColor: item.verifyMode === "Face"
            ? "rgba(167,139,250,0.15)" : "rgba(245,158,11,0.12)"
        }]}>
          <Ionicons
            name={item.verifyMode === "Face" ? "scan-outline" : "finger-print-outline"}
            size={9}
            color={item.verifyMode === "Face" ? "#a78bfa" : "#f59e0b"}
          />
          <Text style={[styles.modeBadgeText, {
            color: item.verifyMode === "Face" ? "#a78bfa" : "#f59e0b"
          }]}>{item.verifyMode || "—"}</Text>
        </View>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════════════════
//  MAIN SCREEN
// ════════════════════════════════════════════════════════
export default function TeacherAttendance() {
  const router = useRouter();
  const intervalRef = useRef(null);

  const [adminCollege, setAdminCollege] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | in | out | absent
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherLogs, setTeacherLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Load admin college ──────────────────────────────
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("adminData");
        if (raw) {
          const d = JSON.parse(raw);
          const college = d.college || d.user?.college || "";
          setAdminCollege(college);
          loadTeacherAttendance(college, selectedDate);
        }
      } catch {}
    })();
  }, [selectedDate]));

  // ── Auto refresh every 15s ──────────────────────────
  useEffect(() => {
    if (autoRefresh && adminCollege) {
      intervalRef.current = setInterval(() => {
        loadTeacherAttendance(adminCollege, selectedDate, false);
      }, 15000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, adminCollege, selectedDate]);

  // ── Load teacher attendance ─────────────────────────
  const loadTeacherAttendance = async (college, date, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await API.get("/biometric/teacher-attendance", {
        params: { college, date },
      });
      const data = res.data;
      setTeachers(data.teachers || []);
      setStats(data.stats || null);
      setLastUpdated(new Date());
    } catch (e) {
      // Silently fail on auto-refresh
      if (showLoader) Alert.alert("Error", "Could not load teacher attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Load individual teacher punch logs ──────────────
  const openTeacherDetail = async (teacher) => {
    setSelectedTeacher(teacher);
    setDetailModal(true);
    setLogsLoading(true);
    try {
      const res = await API.get("/biometric/teacher-logs", {
        params: {
          userId: teacher._id,
          date: selectedDate,
        },
      });
      setTeacherLogs(res.data?.logs || []);
    } catch {
      setTeacherLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // ── Filter teachers ─────────────────────────────────
  const filtered = teachers.filter(t => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (!t.name?.toLowerCase().includes(q) &&
        !t.department?.toLowerCase().includes(q) &&
        !t.teacherId?.toLowerCase().includes(q)) return false;
    }
    // Status filter
    if (filter === "in") return t.lastPunch?.punchType === "CheckIn";
    if (filter === "out") return t.lastPunch?.punchType === "CheckOut";
    if (filter === "absent") return !t.lastPunch;
    return true;
  });

  // ── Date navigation ─────────────────────────────────
  const changeDate = (direction) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    const newDate = d.toISOString().split("T")[0];
    setSelectedDate(newDate);
  };

  const isToday = selectedDate === today();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070d1a" />

      {/* ── Header ── */}
      <LinearGradient colors={["#070d1a", "#0b1a30"]} style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/dashboard")} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Teacher Attendance</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {adminCollege
              ? adminCollege.split(" ").slice(0, 3).join(" ")
              : "Loading..."
            } · {autoRefresh ? "Live" : "Paused"}
          </Text>
        </View>
        {/* Auto refresh toggle */}
        <Pressable
          onPress={() => setAutoRefresh(p => !p)}
          style={[styles.headerBtn, {
            backgroundColor: autoRefresh
              ? "rgba(52,211,153,0.15)"
              : "rgba(255,255,255,0.06)"
          }]}
        >
          <Ionicons
            name={autoRefresh ? "radio-button-on" : "radio-button-off"}
            size={18}
            color={autoRefresh ? "#34d399" : "#64748b"}
          />
        </Pressable>
        {/* Manual refresh */}
        <Pressable
          onPress={() => loadTeacherAttendance(adminCollege, selectedDate)}
          style={styles.headerBtn}
        >
          <Ionicons name="refresh" size={18} color="#f59e0b" />
        </Pressable>
      </LinearGradient>

      {/* ── Date Selector ── */}
      <View style={styles.dateRow}>
        <Pressable onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={18} color="#64748b" />
        </Pressable>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString("en-IN", {
              weekday: "long", day: "2-digit", month: "long",
            })}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>TODAY</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => changeDate(1)}
          style={[styles.dateArrow, isToday && { opacity: 0.3 }]}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </Pressable>
      </View>

      {/* ── Stats Row ── */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard icon="people"         label="Total"      value={stats.total}     color="#a78bfa" />
          <StatCard icon="enter-outline"  label="Present"    value={stats.present}   color="#34d399" />
          <StatCard icon="close-circle"   label="Absent"     value={stats.absent}    color="#f87171" />
          <StatCard icon="time-outline"   label="Punches"    value={stats.totalPunches} color="#f59e0b" />
        </ScrollView>
      )}

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color="#374151" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teacher name, ID, dept..."
            placeholderTextColor="#1f2937"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={15} color="#374151" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { key: "all",    label: "All Teachers", color: "#a78bfa" },
          { key: "in",     label: "Checked In",   color: "#34d399" },
          { key: "out",    label: "Checked Out",  color: "#f87171" },
          { key: "absent", label: "Absent",       color: "#374151" },
        ].map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.chip,
              filter === f.key && {
                backgroundColor: f.color + "18",
                borderColor: f.color + "60",
              },
            ]}
          >
            <Text style={[styles.chipText, filter === f.key && { color: f.color }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>
        {filtered.length} teachers · Last updated: {lastUpdated ? fmtTime(lastUpdated) : "—"}
      </Text>

      {/* ── Teacher List ── */}
      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTeacherAttendance(adminCollege, selectedDate, false);
              }}
              tintColor="#f59e0b"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={44} color="#1f2937" />
              <Text style={styles.emptyTitle}>No teachers found</Text>
              <Text style={styles.emptySub}>
                {filter !== "all"
                  ? "Change filter to see more"
                  : "No biometric punches today"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TeacherRow item={item} onPress={openTeacherDetail} />
          )}
        />
      )}

      {/* ════ DETAIL MODAL ════ */}
      <Modal
        visible={detailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.handle} />

            {/* Modal Header */}
            <View style={styles.detailHeader}>
              <View style={[styles.detailAvatar, {
                backgroundColor: selectedTeacher?.lastPunch
                  ? "rgba(52,211,153,0.15)"
                  : "rgba(100,116,139,0.15)"
              }]}>
                <Text style={[styles.detailAvatarText, {
                  color: selectedTeacher?.lastPunch ? "#34d399" : "#64748b"
                }]}>
                  {initials(selectedTeacher?.name || "")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selectedTeacher?.name}</Text>
                <Text style={styles.detailMeta}>
                  {selectedTeacher?.department || "—"} · {selectedTeacher?.teacherId || "—"}
                </Text>
                <Text style={styles.detailCollege} numberOfLines={1}>
                  {selectedTeacher?.college || adminCollege}
                </Text>
              </View>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setDetailModal(false)}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            {/* Stats for this teacher */}
            <View style={styles.detailStats}>
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatVal, { color: "#34d399" }]}>
                  {selectedTeacher?.todayPunches || 0}
                </Text>
                <Text style={styles.detailStatLabel}>Today's Punches</Text>
              </View>
              <View style={styles.detailStatDiv} />
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatVal, {
                  color: selectedTeacher?.lastPunch ? "#34d399" : "#f87171"
                }]}>
                  {selectedTeacher?.lastPunch ? "Present" : "Absent"}
                </Text>
                <Text style={styles.detailStatLabel}>Today's Status</Text>
              </View>
              <View style={styles.detailStatDiv} />
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatVal, { color: "#f59e0b" }]}>
                  {selectedTeacher?.lastPunch
                    ? fmtTime(selectedTeacher.lastPunch.punchTime)
                    : "—"}
                </Text>
                <Text style={styles.detailStatLabel}>Last Punch</Text>
              </View>
            </View>

            {/* Punch logs */}
            <Text style={styles.detailSectionTitle}>
              Punch History — {new Date(selectedDate).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short",
              })}
            </Text>

            {logsLoading ? (
              <ActivityIndicator
                size="small"
                color="#f59e0b"
                style={{ marginTop: 20 }}
              />
            ) : teacherLogs.length === 0 ? (
              <View style={styles.noLogs}>
                <Ionicons name="time-outline" size={32} color="#1f2937" />
                <Text style={styles.noLogsText}>No punch records for this date</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.logsContainer}
              >
                {teacherLogs.map((log, i) => (
                  <PunchRow key={log._id || i} item={log} index={i} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070d1a" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  headerSub: { color: "#374151", fontSize: 11, marginTop: 1 },

  // Date row
  dateRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: "#0f1b2d", borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center", alignItems: "center",
  },
  dateCenter: {
    flex: 1, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  dateText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  todayBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
  },
  todayBadgeText: { color: "#f59e0b", fontSize: 9, fontWeight: "800" },

  // Stats
  statsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  statCard: {
    borderRadius: 14, padding: 12, alignItems: "center",
    minWidth: 85, borderWidth: 1, gap: 5,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  statVal: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#374151", fontSize: 10, fontWeight: "600" },

  // Search
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1b2d", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 13 },

  // Filter
  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  chipText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  countText: { color: "#1f2937", fontSize: 11, paddingHorizontal: 16, marginBottom: 6 },

  // Teacher list
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  teacherRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0f1b2d", borderRadius: 14,
    padding: 12, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800" },
  teacherInfo: { flex: 1 },
  teacherName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  teacherMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
  teacherTime: { color: "#374151", fontSize: 10, marginTop: 2 },
  teacherRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  punchCount: { color: "#374151", fontSize: 10 },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { color: "#374151", fontSize: 15, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12, textAlign: "center" },

  // Detail Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  detailSheet: {
    backgroundColor: "#0a1220",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    maxHeight: "80%",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "center", marginTop: 12, marginBottom: 4,
  },
  detailHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  detailAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
  },
  detailAvatarText: { fontSize: 16, fontWeight: "800" },
  detailName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  detailMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  detailCollege: { color: "#374151", fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center", alignItems: "center",
  },
  detailStats: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  detailStat: { flex: 1, alignItems: "center" },
  detailStatVal: { fontSize: 16, fontWeight: "900" },
  detailStatLabel: { color: "#374151", fontSize: 10, fontWeight: "600", marginTop: 3 },
  detailStatDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.06)" },
  detailSectionTitle: {
    color: "#374151", fontSize: 10, fontWeight: "800",
    letterSpacing: 1, textTransform: "uppercase",
    paddingHorizontal: 20, paddingVertical: 12,
  },
  logsContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  punchRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 12,
  },
  punchIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  punchType: { fontSize: 13, fontWeight: "700" },
  punchDate: { color: "#64748b", fontSize: 11, marginTop: 2 },
  punchRight: { alignItems: "flex-end", gap: 4 },
  punchTime: { color: "#fff", fontSize: 13, fontWeight: "700" },
  modeBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  modeBadgeText: { fontSize: 9, fontWeight: "700" },
  noLogs: { alignItems: "center", paddingVertical: 30, gap: 8 },
  noLogsText: { color: "#374151", fontSize: 13 },
});