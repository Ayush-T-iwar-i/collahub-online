// app/admin/teacher-attendance.js
// FULLY FIXED RESPONSIVE UI VERSION

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  StatusBar,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const today = () => new Date().toISOString().split("T")[0];

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const StatCard = ({ icon, label, value, color }) => (
  <LinearGradient
    colors={[color + "20", color + "08"]}
    style={[styles.statCard, { borderColor: color + "35" }]}
  >
    <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>

    <Text style={[styles.statValue, { color }]} numberOfLines={1}>
      {value ?? "—"}
    </Text>

    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </LinearGradient>
);

const TeacherRow = ({ item, onPress }) => {
  const isIn = item.lastPunch?.punchType === "CheckIn";

  const statusColor = !item.lastPunch
    ? "#64748b"
    : isIn
    ? "#34d399"
    : "#f87171";

  const statusText = !item.lastPunch
    ? "Absent"
    : isIn
    ? "Checked In"
    : "Checked Out";

  return (
    <Pressable style={styles.teacherRow} onPress={() => onPress(item)}>
      {/* LEFT */}
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: statusColor + "20" },
          ]}
        >
          <Text style={[styles.avatarText, { color: statusColor }]}>
            {initials(item.name)}
          </Text>
        </View>

        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.teacherMeta} numberOfLines={1}>
            {item.department || "—"}
          </Text>

          <Text style={styles.teacherSub} numberOfLines={1}>
            {item.teacherId || item.email || "—"}
          </Text>
        </View>
      </View>

      {/* RIGHT */}
      <View style={styles.rowRight}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusColor + "15",
              borderColor: statusColor + "35",
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
            ]}
          />

          <Text
            style={[styles.statusText, { color: statusColor }]}
            numberOfLines={1}
          >
            {statusText}
          </Text>
        </View>

        <Text style={styles.punchCount}>
          {item.todayPunches || 0} punches
        </Text>

        {item.lastPunch && (
          <Text style={styles.lastTime}>
            {fmtTime(item.lastPunch.punchTime)}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const PunchRow = ({ item }) => {
  const isIn = item.punchType === "CheckIn";

  const color = isIn ? "#34d399" : "#f87171";

  return (
    <View style={styles.punchRow}>
      <View
        style={[
          styles.punchIcon,
          { backgroundColor: color + "18" },
        ]}
      >
        <Ionicons
          name={isIn ? "enter-outline" : "exit-outline"}
          size={14}
          color={color}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.punchType, { color }]}>
          {isIn ? "Check In" : "Check Out"}
        </Text>

        <Text style={styles.punchDate}>
          {fmtDate(item.punchTime)}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.punchTime}>
          {fmtTime(item.punchTime)}
        </Text>

        <View
          style={[
            styles.modeBadge,
            {
              backgroundColor:
                item.verifyMode === "Face"
                  ? "rgba(167,139,250,0.15)"
                  : "rgba(245,158,11,0.15)",
            },
          ]}
        >
          <Text
            style={[
              styles.modeText,
              {
                color:
                  item.verifyMode === "Face"
                    ? "#a78bfa"
                    : "#f59e0b",
              },
            ]}
          >
            {item.verifyMode || "—"}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function TeacherAttendance() {
  const router = useRouter();

  const intervalRef = useRef(null);

  const [adminCollege, setAdminCollege] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedDate, setSelectedDate] = useState(today());

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // MODAL
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherLogs, setTeacherLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem("adminData");

          if (raw) {
            const d = JSON.parse(raw);

            const college =
              d.college || d.user?.college || "";

            setAdminCollege(college);

            loadTeacherAttendance(college, selectedDate);
          }
        } catch (e) {}
      })();
    }, [selectedDate])
  );

  useEffect(() => {
    if (autoRefresh && adminCollege) {
      intervalRef.current = setInterval(() => {
        loadTeacherAttendance(
          adminCollege,
          selectedDate,
          false
        );
      }, 15000);
    }

    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, adminCollege, selectedDate]);

  const loadTeacherAttendance = async (
    college,
    date,
    showLoader = true
  ) => {
    if (showLoader) setLoading(true);

    try {
      const res = await API.get(
        "/biometric/teacher-attendance",
        {
          params: { college, date },
        }
      );

      setTeachers(res.data?.teachers || []);
      setStats(res.data?.stats || null);

      setLastUpdated(new Date());
    } catch (e) {
      if (showLoader) {
        Alert.alert(
          "Error",
          "Could not load teacher attendance"
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openTeacherDetail = async (teacher) => {
    setSelectedTeacher(teacher);

    setDetailModal(true);

    setLogsLoading(true);

    try {
      const res = await API.get(
        "/biometric/teacher-logs",
        {
          params: {
            userId: teacher._id,
            date: selectedDate,
          },
        }
      );

      setTeacherLogs(res.data?.logs || []);
    } catch {
      setTeacherLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const filtered = teachers.filter((t) => {
    if (search) {
      const q = search.toLowerCase();

      if (
        !t.name?.toLowerCase().includes(q) &&
        !t.department?.toLowerCase().includes(q) &&
        !t.teacherId?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    if (filter === "in")
      return t.lastPunch?.punchType === "CheckIn";

    if (filter === "out")
      return t.lastPunch?.punchType === "CheckOut";

    if (filter === "absent") return !t.lastPunch;

    return true;
  });

  const changeDate = (dir) => {
    const d = new Date(selectedDate);

    d.setDate(d.getDate() + dir);

    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === today();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#070d1a"
      />

      {/* HEADER */}
      <LinearGradient
        colors={["#070d1a", "#0b1a30"]}
        style={styles.header}
      >
        <Pressable
          style={styles.headerBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/admin/dashboard")
          }
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#fff"
          />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>
            Teacher Attendance
          </Text>

          <Text style={styles.headerSub} numberOfLines={1}>
            {adminCollege || "Loading..."}
          </Text>
        </View>

        <Pressable
          style={styles.headerBtn}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <Ionicons
            name={
              autoRefresh
                ? "radio-button-on"
                : "radio-button-off"
            }
            size={18}
            color={autoRefresh ? "#34d399" : "#64748b"}
          />
        </Pressable>
      </LinearGradient>

      {/* DATE */}
      <View style={styles.dateRow}>
        <Pressable
          style={styles.dateArrow}
          onPress={() => changeDate(-1)}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color="#94a3b8"
          />
        </Pressable>

        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString(
              "en-IN",
              {
                weekday: "long",
                day: "2-digit",
                month: "long",
              }
            )}
          </Text>

          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>
                TODAY
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.dateArrow,
            isToday && { opacity: 0.3 },
          ]}
          disabled={isToday}
          onPress={() => changeDate(1)}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color="#94a3b8"
          />
        </Pressable>
      </View>

      {/* STATS */}
      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <StatCard
            icon="people"
            label="Total"
            value={stats.total}
            color="#a78bfa"
          />

          <StatCard
            icon="enter-outline"
            label="Present"
            value={stats.present}
            color="#34d399"
          />

          <StatCard
            icon="close-circle"
            label="Absent"
            value={stats.absent}
            color="#f87171"
          />

          <StatCard
            icon="time-outline"
            label="Punches"
            value={stats.totalPunches}
            color="#f59e0b"
          />
        </ScrollView>
      )}

      {/* SEARCH */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={15}
            color="#64748b"
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
          />

          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color="#64748b"
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* FILTERS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          {
            key: "all",
            label: "All",
            color: "#a78bfa",
          },
          {
            key: "in",
            label: "Checked In",
            color: "#34d399",
          },
          {
            key: "out",
            label: "Checked Out",
            color: "#f87171",
          },
          {
            key: "absent",
            label: "Absent",
            color: "#64748b",
          },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              filter === f.key && {
                borderColor: f.color,
                backgroundColor: f.color + "15",
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && {
                  color: f.color,
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.countText}>
        {filtered.length} teachers
      </Text>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#f59e0b"
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);

                loadTeacherAttendance(
                  adminCollege,
                  selectedDate,
                  false
                );
              }}
              tintColor="#f59e0b"
            />
          }
          renderItem={({ item }) => (
            <TeacherRow
              item={item}
              onPress={openTeacherDetail}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={52}
                color="#1e293b"
              />

              <Text style={styles.emptyTitle}>
                No Teachers Found
              </Text>

              <Text style={styles.emptySub}>
                No attendance records available
              </Text>
            </View>
          }
        />
      )}

      {/* DETAIL MODAL */}
      <Modal
        visible={detailModal}
        transparent
        animationType="slide"
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={styles.modalTitle}
                  numberOfLines={1}
                >
                  {selectedTeacher?.name}
                </Text>

                <Text
                  style={styles.modalSub}
                  numberOfLines={1}
                >
                  {selectedTeacher?.department}
                </Text>
              </View>

              <Pressable
                style={styles.closeBtn}
                onPress={() => setDetailModal(false)}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color="#94a3b8"
                />
              </Pressable>
            </View>

            {logsLoading ? (
              <ActivityIndicator
                size="small"
                color="#f59e0b"
                style={{ marginTop: 30 }}
              />
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 40,
                }}
              >
                {teacherLogs.length === 0 ? (
                  <View style={styles.noLogs}>
                    <Ionicons
                      name="time-outline"
                      size={40}
                      color="#1e293b"
                    />

                    <Text style={styles.noLogsText}>
                      No punch records
                    </Text>
                  </View>
                ) : (
                  teacherLogs.map((log, i) => (
                    <PunchRow
                      key={log._id || i}
                      item={log}
                    />
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070d1a",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 18 : 10,
    paddingBottom: 14,
    gap: 12,
  },

  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  headerSub: {
    color: "#e6e8eb",
    fontSize: 11,
    marginTop: 2,
  },

  dateRow: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 10,
  },

  dateArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  dateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  dateText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  todayBadge: {
    marginTop: 5,
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  todayText: {
    color: "#f59e0b",
    fontSize: 9,
    fontWeight: "800",
  },

  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },

  statCard: {
    width: width * 0.24,
    minWidth: 95,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 20,
    fontWeight: "900",
  },

  statLabel: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },

  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
  },

  filterRow: {
    paddingHorizontal: 10,
    gap: 11,
    paddingBottom: 10,
  },

  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  filterText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },

  countText: {
    color: "#475569",
    fontSize: 11,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  teacherRow: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  rowRight: {
    alignItems: "flex-end",
    maxWidth: 110,
    marginLeft: 10,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "800",
  },

  teacherInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  teacherName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  teacherMeta: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },

  teacherSub: {
    color: "#475569",
    fontSize: 10,
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  punchCount: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 6,
  },

  lastTime: {
    color: "#cbd5e1",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700",
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
  },

  emptyTitle: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },

  emptySub: {
    color: "#475569",
    fontSize: 12,
    marginTop: 6,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "80%",
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 10,
  },

  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "center",
    marginBottom: 12,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  modalSub: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 3,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  punchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111c30",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  punchIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  punchType: {
    fontSize: 13,
    fontWeight: "800",
  },

  punchDate: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 3,
  },

  punchTime: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  modeBadge: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  modeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  noLogs: {
    alignItems: "center",
    paddingVertical: 50,
  },

  noLogsText: {
    color: "#64748b",
    marginTop: 12,
    fontSize: 13,
  },
});
