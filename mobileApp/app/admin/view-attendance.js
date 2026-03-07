import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  TextInput, StatusBar, ActivityIndicator, RefreshControl,
  ScrollView, Dimensions, Modal, Alert, Animated, UIManager, Platform, LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

const SEMESTERS = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];
const COLLEGE_DEPARTMENTS = {
  "Nims Institute of Engineering and Technology": [
    "Computer Science Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics and Communication Engineering (ECE)",
    "Electrical Engineering (EE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering",
    "Chemical Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science Engineering",
  ],
  "Nims College of Management Studies": ["Business Administration", "Finance", "Marketing", "Human Resource"],
  "Nims College of Nursing": ["B.Sc Nursing", "GNM", "Post Basic Nursing"],
  "Nims College of Pharmacy": ["B.Pharm", "D.Pharm", "M.Pharm"],
  "Nims College of Law": ["LLB", "BA LLB", "LLM"],
  "Nims College of Dental": ["BDS", "MDS"],
};
const COLLEGES = Object.keys(COLLEGE_DEPARTMENTS);
const DEPARTMENTS_ALL = Array.from(new Set(Object.values(COLLEGE_DEPARTMENTS).flat()));

const COLLEGE_SHORT = {
  "Nims Institute of Engineering and Technology": "NIET",
  "Nims College of Management Studies": "NCMS",
  "Nims College of Nursing": "NCN",
  "Nims College of Pharmacy": "NCP",
  "Nims College of Law": "NCL",
  "Nims College of Dental": "NCD",
};
const COLLEGE_COLORS = {
  NIET: "#00c6ff", NCMS: "#34d399", NCN: "#f87171",
  NCP: "#a78bfa", NCL: "#f59e0b", NCD: "#fb923c",
};

const getPercent = (present, total) => {
  if (!total || total === 0) return 0;
  return Math.round((present / total) * 100);
};

const getDeptShort = (dept = "") => {
  if (!dept) return "";
  return dept.match(/\(([^)]+)\)/)?.[1] || dept.split(" ")[0] || "";
};


// Circular Progress Ring
// ─────────────────────────────────────────────
const ProgressRing = ({ percent, size = 44, stroke = 3.5, color }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const ringColor = percent >= 75 ? "#34d399"
    : percent >= 50 ? "#f59e0b"
      : "#f87171";

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <View style={{
        position: "absolute", width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: "rgba(255,255,255,0.06)",
      }} />
      <View style={{
        position: "absolute", width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderTopColor: percent > 0 ? ringColor : "transparent",
        borderRightColor: percent > 25 ? ringColor : "transparent",
        borderBottomColor: percent > 50 ? ringColor : "transparent",
        borderLeftColor: percent > 75 ? ringColor : "transparent",
        transform: [{ rotate: "-90deg" }],
      }} />
      <Text style={{ color: ringColor, fontSize: size * 0.22, fontWeight: "900" }}>
        {percent}
      </Text>
    </View>
  );
};

// Subject Row inside student card
const SubjectRow = ({ subject, index }) => {
  const pct = subject.percent;
  const isBad = pct < 75;
  const barColor = pct >= 75 ? "#34d399" : pct >= 50 ? "#f59e0b" : "#f87171";
  const rowBg = isBad ? "rgba(248,113,113,0.05)" : "rgba(52,211,153,0.03)";

  return (
    <View style={[styles.subjRow, { backgroundColor: rowBg }, index > 0 && { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)" }]}>
      <View style={styles.subjLeft}>
        <View style={[styles.subjDot, { backgroundColor: barColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.subjName} numberOfLines={1}>{subject.subjectName || "Subject"}</Text>
          <Text style={styles.subjMeta}>{subject.presentCount}/{subject.totalClasses} classes attended</Text>
        </View>
      </View>
      <View style={styles.subjRight}>
        <Text style={[styles.subjPct, { color: barColor }]}>{pct}%</Text>
        <View style={[styles.subjPill, { backgroundColor: barColor + "22", borderColor: barColor + "44" }]}>
          <Text style={[styles.subjPillText, { color: barColor }]}>
            {isBad ? "LOW" : "OK"}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Student Card
const StudentCard = ({ student, subjects, expanded, onToggle, color }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // animate chevron and trigger layout animation for smooth reflow
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(anim, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [expanded]);

  const initials = student.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const badCount = subjects.filter(s => s.percent < 75).length;
  const totalSubs = subjects.length;
  const overallPct = totalSubs > 0
    ? Math.round(subjects.reduce((acc, s) => acc + s.percent, 0) / totalSubs)
    : null;

  const cardColor = badCount > 0 ? "#f87171" : "#34d399";

  const chevronRotate = anim.interpolate({
    inputRange: [0, 1], outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.studentCard, { borderLeftColor: cardColor }]}>
      <Pressable onPress={onToggle} style={styles.studentRow}>
        <View style={[styles.studentAvatar, { backgroundColor: (color || "#a78bfa") + "22" }]}>
          <Text style={[styles.studentAvatarText, { color: color || "#a78bfa" }]}>{initials}</Text>
        </View>

        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
          <View style={styles.studentMetaRow}>
            <Ionicons name="card-outline" size={11} color="#64748b" />
            <Text style={styles.studentIdText}>{student.studentId || "—"}</Text>
            {student.semester && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.studentIdText}>Sem {student.semester}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.studentRight}>
          {overallPct !== null && (
            <ProgressRing percent={overallPct} size={42} />
          )}
          {badCount > 0 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{badCount}</Text>
            </View>
          )}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginLeft: 8 }}>
            <Ionicons name="chevron-down" size={16} color="#374151" />
          </Animated.View>
        </View>
      </Pressable>

      {/* Subjects expanded — no absolute positioning; will push content down */}
      {expanded && (
        <View style={styles.subjContainer}>
          {subjects.length === 0 ? (
            <View style={styles.noSubjWrap}>
              <Ionicons name="book-outline" size={20} color="#374151" />
              <Text style={styles.noSubjText}>No attendance records yet</Text>
            </View>
          ) : (
            subjects.map((s, i) => <SubjectRow key={i} subject={s} index={i} />)
          )}
        </View>
      )}
    </View>
  );
};

// MAIN SCREEN
export default function ViewAttendance() {
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCollege, setSelectedCollege] = useState(null);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedSem, setSelectedSem] = useState("All");
  const [search, setSearch] = useState("");

  const [grouped, setGrouped] = useState({});
  const [visibleStudents, setVisibleStudents] = useState([]);
  const [expandedMap, setExpandedMap] = useState({});

  const [defaultersModal, setDefaultersModal] = useState(false);
  const [defaultersList, setDefaultersList] = useState([]);
  const [filterModal, setFilterModal] = useState(false);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [stuRes, attRes] = await Promise.all([
        API.get("/students/all").catch(() => ({ data: { students: [] } })),
        API.get("/attendance/all").catch(() => ({ data: { records: [] } })),
      ]);
      const studs = stuRes.data?.students || stuRes.data || [];
      const atts = attRes.data?.records || attRes.data || [];

      setStudents(studs);
      setAttendance(atts);

      const initCollege = selectedCollege || COLLEGES[0] || null;
      setSelectedCollege(prev => prev || initCollege);

      const map = buildGroupedMap(studs, atts);
      setGrouped(map);
      refreshVisible(map, initCollege, selectedDept, selectedSem, search);
    } catch (e) {
      console.warn("Load error", e);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const buildGroupedMap = (studs, atts) => {
    const map = {};
    studs.forEach(s => { map[s._id || s.studentId] = { student: s, subjects: [] }; });
    atts.forEach(r => {
      const sid = r.studentId || r._id || r.student?._id || null;
      if (!sid) return;
      if (!map[sid]) {
        map[sid] = { student: { _id: sid, name: r.studentName || r.student?.name || "Unknown", studentId: r.studentId || "" }, subjects: [] };
      }
      const present = Number(r.presentCount || r.present || 0);
      const total = Number(r.totalClasses || r.total || 0);
      map[sid].subjects.push({
        subjectName: r.subjectName || r.subject || "Subject",
        presentCount: present,
        totalClasses: total,
        percent: getPercent(present, total),
      });
    });
    return map;
  };

  const refreshVisible = (map = grouped, college = selectedCollege, dept = selectedDept, sem = selectedSem, q = search) => {
    const ids = [];
    Object.values(map).forEach(entry => {
      const s = entry.student || {};
      if (college && s.college && !String(s.college).toLowerCase().includes((college || "").toLowerCase())) return;
      if (dept && dept !== "All" && s.department && !String(s.department).toLowerCase().includes(dept.toLowerCase())) return;
      if (sem && sem !== "All" && s.semester && String(s.semester) !== String(sem)) return;
      if (q) {
        if (!(s.name || "").toLowerCase().includes(q.toLowerCase()) &&
          !(s.studentId || "").toLowerCase().includes(q.toLowerCase())) return;
      }
      ids.push(s._id || s.studentId);
    });
    setVisibleStudents(ids);
  };

  const onSelectCollege = (c) => { setSelectedCollege(c); setSelectedDept("All"); refreshVisible(grouped, c, "All", selectedSem, search); };
  const onSelectDept = (d) => { setSelectedDept(d); refreshVisible(grouped, selectedCollege, d, selectedSem, search); };
  const onSelectSem = (s) => { setSelectedSem(s); refreshVisible(grouped, selectedCollege, selectedDept, s, search); };
  const onSearch = (t) => { setSearch(t); refreshVisible(grouped, selectedCollege, selectedDept, selectedSem, t); };
  const toggleExpand = (id) => {
    // Use LayoutAnimation for smooth reflow
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    refreshVisible(grouped, selectedCollege, selectedDept, selectedSem, search);
  }, [grouped]);

  const buildDefaulters = () => {
    const def = [];
    Object.values(grouped).forEach(entry => {
      const bad = (entry.subjects || []).filter(x => x.percent < 75);
      if (bad.length > 0) def.push({ student: entry.student, subjects: bad });
    });
    return def;
  };

  const showDefaulters = () => {
    setDefaultersList(buildDefaulters());
    setDefaultersModal(true);
  };

  const copyDefaulters = async () => {
    if (!defaultersList.length) return Alert.alert("", "No defaulters to copy");
    let text = `Defaulter List\n${selectedCollege || ""} · ${selectedDept || "All"} · Sem ${selectedSem}\n${"─".repeat(40)}\n\n`;
    defaultersList.forEach(d => {
      text += `${d.student.name} (${d.student.studentId || d.student._id})\n`;
      d.subjects.forEach(s => { text += `  • ${s.subjectName}: ${s.percent}% (${s.presentCount}/${s.totalClasses})\n`; });
      text += "\n";
    });
    await Clipboard.setStringAsync(text);
    Alert.alert("✅ Copied", "Defaulter list clipboard pe copy ho gaya!");
  };

  const stats = (() => {
    let defaulters = 0, safe = 0;
    visibleStudents.forEach(id => {
      const subs = grouped[id]?.subjects || [];
      if (subs.some(s => s.percent < 75)) defaulters++; else safe++;
    });
    return { total: visibleStudents.length, defaulters, safe };
  })();

  const deptOptions = selectedCollege ? (COLLEGE_DEPARTMENTS[selectedCollege] || []) : DEPARTMENTS_ALL;
  const activeColShort = selectedCollege ? (COLLEGE_SHORT[selectedCollege] || "COL") : null;
  const activeColColor = activeColShort ? (COLLEGE_COLORS[activeColShort] || "#a78bfa") : "#a78bfa";

  const filterSummary = [
    selectedCollege ? (COLLEGE_SHORT[selectedCollege] || selectedCollege) : null,
    selectedDept !== "All" ? getDeptShort(selectedDept) : null,
    selectedSem !== "All" ? `Sem ${selectedSem}` : null,
  ].filter(Boolean).join(" · ") || "All Students";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17" />

      <LinearGradient colors={["#080d17", "#0f1923"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{filterSummary}</Text>
        </View>
        <Pressable style={styles.filterBtn} onPress={() => setFilterModal(true)}>
          <Ionicons name="options-outline" size={20} color={activeColColor} />
          {(selectedDept !== "All" || selectedSem !== "All") && (
            <View style={[styles.filterDot, { backgroundColor: activeColColor }]} />
          )}
        </Pressable>
      </LinearGradient>

      <View style={styles.statsRow}>
        <LinearGradient colors={["#1a2535", "#141e2c"]} style={[styles.statCard, { borderTopColor: "#a78bfa" }]}>
          <Text style={[styles.statNum, { color: "#a78bfa" }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </LinearGradient>
        <LinearGradient colors={["#1a2535", "#141e2c"]} style={[styles.statCard, { borderTopColor: "#f87171" }]}>
          <View style={styles.statNumRow}>
            <Text style={[styles.statNum, { color: "#f87171" }]}>{stats.defaulters}</Text>
            {stats.total > 0 && (
              <Text style={styles.statPct}>{Math.round(stats.defaulters / stats.total * 100)}%</Text>
            )}
          </View>
          <Text style={styles.statLabel}>Defaulters</Text>
        </LinearGradient>
        <LinearGradient colors={["#1a2535", "#141e2c"]} style={[styles.statCard, { borderTopColor: "#34d399" }]}>
          <View style={styles.statNumRow}>
            <Text style={[styles.statNum, { color: "#34d399" }]}>{stats.safe}</Text>
            {stats.total > 0 && (
              <Text style={styles.statPct}>{Math.round(stats.safe / stats.total * 100)}%</Text>
            )}
          </View>
          <Text style={styles.statLabel}>Safe</Text>
        </LinearGradient>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {COLLEGES.map(c => {
          const s = COLLEGE_SHORT[c] || "COL";
          const col = COLLEGE_COLORS[s] || "#64748b";
          const isAct = selectedCollege === c;
          return (
            <Pressable key={c} onPress={() => onSelectCollege(c)}
              style={[styles.collegeChip, isAct && { backgroundColor: col + "22", borderColor: col + "55" }]}>
              <View style={[styles.collegeChipDot, { backgroundColor: isAct ? col : "#374151" }]} />
              <Text style={[styles.collegeChipText, isAct && { color: col }]}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color="#64748b" />
          <TextInput style={styles.searchInput}
            placeholder="Name ya Student ID..." placeholderTextColor="#374151"
            value={search} onChangeText={onSearch} />
          {search.length > 0 && (
            <Pressable onPress={() => onSearch("")}>
              <Ionicons name="close-circle" size={14} color="#64748b" />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.defaulterBtn} onPress={showDefaulters}>
          <Ionicons name="warning-outline" size={16} color="#f87171" />
          {stats.defaulters > 0 && (
            <View style={styles.defaulterBadge}>
              <Text style={styles.defaulterBadgeText}>{stats.defaulters}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {(selectedDept !== "All" || selectedSem !== "All") && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.activePillRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {selectedDept !== "All" && (
            <Pressable style={styles.activePill} onPress={() => onSelectDept("All")}>
              <Text style={styles.activePillText}>{getDeptShort(selectedDept)}</Text>
              <Ionicons name="close" size={11} color="#a78bfa" />
            </Pressable>
          )}
          {selectedSem !== "All" && (
            <Pressable style={styles.activePill} onPress={() => onSelectSem("All")}>
              <Text style={styles.activePillText}>Sem {selectedSem}</Text>
              <Ionicons name="close" size={11} color="#a78bfa" />
            </Pressable>
          )}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={activeColColor} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleStudents}
          keyExtractor={id => id}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={activeColColor} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={40} color="#374151" />
              </View>
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptySub}>Filter change karo ya pull to refresh karo</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const entry = grouped[item];
            const student = entry?.student || { _id: item, name: "Unknown", studentId: item };
            const subjects = entry?.subjects || [];
            return (
              <StudentCard
                student={student}
                subjects={subjects}
                expanded={!!expandedMap[item]}
                onToggle={() => toggleExpand(item)}
                color={activeColColor}
              />
            );
          }}
          extraData={expandedMap} // ensure re-render when expand state changes
        />
      )}

      {/* FILTER MODAL */}
      <Modal visible={filterModal} transparent animationType="slide" onRequestClose={() => setFilterModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.filterSheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                <Ionicons name="options-outline" size={17} color="#a78bfa" />
              </View>
              <Text style={styles.sheetTitle}>Filter Attendance</Text>
              <Pressable style={styles.closeBtn} onPress={() => setFilterModal(false)}>
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={styles.filterSectionLabel}>DEPARTMENT</Text>
              <View style={styles.filterChipsWrap}>
                <Pressable
                  style={[styles.filterChip, selectedDept === "All" && styles.filterChipActive]}
                  onPress={() => onSelectDept("All")}>
                  <Text style={[styles.filterChipText, selectedDept === "All" && { color: "#a78bfa" }]}>All</Text>
                </Pressable>
                {deptOptions.map(d => {
                  const short = getDeptShort(d);
                  const isAct = selectedDept === d;
                  return (
                    <Pressable key={d}
                      style={[styles.filterChip, isAct && styles.filterChipActive]}
                      onPress={() => onSelectDept(d)}>
                      <Text style={[styles.filterChipText, isAct && { color: "#a78bfa" }]}>{short}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.filterSectionLabel}>SEMESTER</Text>
              <View style={styles.semGrid}>
                {SEMESTERS.map(s => {
                  const isAct = selectedSem === s;
                  return (
                    <Pressable key={s}
                      style={[styles.semBox, isAct && styles.semBoxActive]}
                      onPress={() => onSelectSem(s)}>
                      <Text style={[styles.semBoxText, isAct && { color: "#a78bfa" }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
              <Pressable style={styles.applyBtn} onPress={() => setFilterModal(false)}>
                <LinearGradient colors={["#7c3aed", "#a78bfa"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtnGrad}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* DEFAULTERS MODAL */}
      <Modal visible={defaultersModal} transparent animationType="slide" onRequestClose={() => setDefaultersModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.filterSheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: "rgba(248,113,113,0.15)" }]}>
                <Ionicons name="warning-outline" size={17} color="#f87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Defaulter List</Text>
                <Text style={styles.sheetSub}>{defaultersList.length} students below 75%</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setDefaultersModal(false)}>
                <Ionicons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
              {defaultersList.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="checkmark-circle-outline" size={40} color="#34d399" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: "#34d399" }]}>No Defaulters! 🎉</Text>
                  <Text style={styles.emptySub}>Sab students safe hain.</Text>
                </View>
              ) : (
                defaultersList.map((d, i) => (
                  <View key={i} style={styles.defCard}>
                    <View style={styles.defHeader}>
                      <View style={styles.defAvatar}>
                        <Text style={styles.defAvatarText}>
                          {d.student.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.defName}>{d.student.name}</Text>
                        <Text style={styles.defId}>{d.student.studentId || d.student._id}</Text>
                      </View>
                      <View style={styles.defCountBadge}>
                        <Text style={styles.defCountText}>{d.subjects.length} subj</Text>
                      </View>
                    </View>
                    {d.subjects.map((s, j) => (
                      <View key={j} style={styles.defSubjRow}>
                        <Text style={styles.defSubjName} numberOfLines={1}>{s.subjectName}</Text>
                        <View style={styles.defSubjRight}>
                          <Text style={styles.defSubjMeta}>{s.presentCount}/{s.totalClasses}</Text>
                          <Text style={styles.defSubjPct}>{s.percent}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>

            {defaultersList.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 30 }}>
                <Pressable style={styles.applyBtn} onPress={copyDefaulters}>
                  <LinearGradient colors={["#f87171", "#ef4444"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtnGrad}>
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                    <Text style={styles.applyBtnText}>Copy to Clipboard</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080d17" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#374151", fontSize: 12, fontWeight: "600" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  filterDot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", borderTopWidth: 2 },
  statNumRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statNum: { fontSize: 22, fontWeight: "900" },
  statPct: { fontSize: 10, color: "#374151", fontWeight: "700" },
  statLabel: { color: "#64748b", fontSize: 9, fontWeight: "700", marginTop: 3 },

  chipsRow: { marginTop: 12 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  collegeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  collegeChipDot: { width: 7, height: 7, borderRadius: 4 },
  collegeChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },

  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginTop: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1a2535", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },
  defaulterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(248,113,113,0.12)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(248,113,113,0.25)" },
  defaulterBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "#f87171", borderRadius: 8, width: 16, height: 16, justifyContent: "center", alignItems: "center" },
  defaulterBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },

  activePillRow: { marginTop: 8 },
  activePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(167,139,250,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(167,139,250,0.3)" },
  activePillText: { color: "#a78bfa", fontSize: 11, fontWeight: "700" },

  list: { padding: 16, paddingBottom: 40 },

  // NOTE: removed overflow:hidden to avoid clipping expanded content during animation
  studentCard: { backgroundColor: "#111927", borderRadius: 16, marginBottom: 10, /*overflow:"hidden",*/ borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", borderLeftWidth: 3 },
  studentRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  studentAvatarText: { fontSize: 15, fontWeight: "800" },
  studentInfo: { flex: 1 },
  studentName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  studentMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  studentIdText: { color: "#64748b", fontSize: 11 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#374151" },
  studentRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  badgePill: { backgroundColor: "#f87171", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, position: "absolute", top: -6, right: 24 },
  badgePillText: { color: "#fff", fontSize: 9, fontWeight: "900" },

  subjContainer: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.04)", backgroundColor: "#0f1724" },
  subjRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  subjLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  subjDot: { width: 8, height: 8, borderRadius: 4 },
  subjName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  subjMeta: { color: "#64748b", fontSize: 11, marginTop: 2 },
  subjRight: { alignItems: "flex-end", gap: 4 },
  subjPct: { fontSize: 14, fontWeight: "900" },
  subjPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  subjPillText: { fontSize: 9, fontWeight: "800" },
  noSubjWrap: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  noSubjText: { color: "#374151", fontSize: 12 },

  empty: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 20 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#1a2535", justifyContent: "center", alignItems: "center" },
  emptyTitle: { color: "#374151", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#1f2937", fontSize: 12, textAlign: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "flex-end" },
  filterSheet: { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.88, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, paddingBottom: 8 },
  sheetIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sheetTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "800" },
  sheetSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },

  filterSectionLabel: { color: "#374151", fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 10 },
  filterChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1a2535", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  filterChipActive: { backgroundColor: "rgba(167,139,250,0.15)", borderColor: "rgba(167,139,250,0.4)" },
  filterChipText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  semGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  semBox: { width: (width - 80) / 5, aspectRatio: 1, backgroundColor: "#1a2535", borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.07)" },
  semBoxActive: { backgroundColor: "rgba(167,139,250,0.18)", borderColor: "#a78bfa" },
  semBoxText: { color: "#64748b", fontSize: 14, fontWeight: "800" },

  applyBtn: { borderRadius: 14, overflow: "hidden" },
  applyBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  defCard: { backgroundColor: "#141e2c", borderRadius: 14, marginBottom: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(248,113,113,0.15)" },
  defHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  defAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(248,113,113,0.15)", justifyContent: "center", alignItems: "center" },
  defAvatarText: { color: "#f87171", fontSize: 13, fontWeight: "800" },
  defName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  defId: { color: "#64748b", fontSize: 11, marginTop: 1 },
  defCountBadge: { backgroundColor: "rgba(248,113,113,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  defCountText: { color: "#f87171", fontSize: 10, fontWeight: "700" },
  defSubjRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)" },
  defSubjName: { color: "#94a3b8", fontSize: 12, flex: 1 },
  defSubjRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  defSubjMeta: { color: "#374151", fontSize: 11 },
  defSubjPct: { color: "#f87171", fontSize: 13, fontWeight: "900" },
});