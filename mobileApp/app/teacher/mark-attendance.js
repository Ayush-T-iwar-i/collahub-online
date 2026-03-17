import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  ScrollView, Alert, Dimensions, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width } = Dimensions.get("window");

const ROLE_COLORS = { admin:"#a78bfa", teacher:"#f59e0b", student:"#00c6ff" };
const DEPT_COLORS = {
  CSE:"#00c6ff", ECE:"#a78bfa", ME:"#f59e0b",
  CE:"#34d399",  IT:"#f87171", EEE:"#60a5fa",
};
const getColor = (dept="") => {
  const key = Object.keys(DEPT_COLORS).find(k=>dept.toUpperCase().includes(k));
  return DEPT_COLORS[key] || "#64748b";
};

// ── Subject Selector Card ──
const SubjectCard = ({ item, isSelected, onPress }) => {
  const color = getColor(item.department);
  const short = item.department?.match(/\(([^)]+)\)/)?.[1] || item.department?.split(" ")[0] || "";
  return (
    <Pressable
      style={[styles.subjectCard, isSelected && { borderColor: color, borderWidth: 1.5 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={isSelected ? [color+"30", color+"10"] : ["#1a2535","#1a2535"]}
        style={styles.subjectGrad}
      >
        <View style={[styles.subjectIconBox, { backgroundColor: color+"22" }]}>
          <Ionicons name="book" size={22} color={color} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={styles.subjectName} numberOfLines={1}>{item.subjectName}</Text>
          {item.subjectCode ? <Text style={styles.subjectCode}>{item.subjectCode}</Text> : null}
          <View style={styles.subjectMeta}>
            <View style={[styles.metaBadge, { backgroundColor: color+"18" }]}>
              <Text style={[styles.metaBadgeText, { color }]}>{short} {item.admissionYear}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>Sem {item.semester}</Text>
            </View>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={color} />
        )}
      </LinearGradient>
    </Pressable>
  );
};

// ── Student Attendance Row ──
const StudentRow = ({ item, status, onToggle }) => {
  const color    = getColor(item.department);
  const initials = item.name?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S";
  const isPresent = status === "present";
  const isAbsent  = status === "absent";

  return (
    <View style={styles.studentRow}>
      <View style={[styles.studentAvatar, { backgroundColor: color+"22" }]}>
        {item.profileImage
          ? <Image source={{ uri: item.profileImage }} style={styles.studentAvatarImg}/>
          : <Text style={[styles.studentAvatarText, { color }]}>{initials}</Text>}
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.studentId}>{item.studentId || "—"}</Text>
      </View>
      {/* Present / Absent buttons */}
      <View style={styles.attendanceBtns}>
        <Pressable
          style={[styles.attBtn, isPresent && styles.presentBtn]}
          onPress={() => onToggle(item._id, "present")}
        >
          <Ionicons
            name={isPresent ? "checkmark-circle" : "checkmark-circle-outline"}
            size={22} color={isPresent ? "#34d399" : "#374151"}
          />
        </Pressable>
        <Pressable
          style={[styles.attBtn, isAbsent && styles.absentBtn]}
          onPress={() => onToggle(item._id, "absent")}
        >
          <Ionicons
            name={isAbsent ? "close-circle" : "close-circle-outline"}
            size={22} color={isAbsent ? "#f87171" : "#374151"}
          />
        </Pressable>
      </View>
    </View>
  );
};

// ════════════════════════════════════════════
export default function MarkAttendance() {
  const navigation = useNavigation();

  // Step 1: Select subject
  const [subjects, setSubjects]       = useState([]);
  const [subLoading, setSubLoading]   = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Step 2: Mark attendance
  const [students, setStudents]       = useState([]);
  const [stuLoading, setStuLoading]   = useState(false);
  const [attendance, setAttendance]   = useState({}); // { studentId: "present"|"absent" }
  const [submitting, setSubmitting]   = useState(false);
  const [date, setDate]               = useState(() => new Date().toISOString().split("T")[0]);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);

  useFocusEffect(useCallback(() => {
    loadSubjects();
    return () => { setSelectedSubject(null); setStudents([]); setAttendance({}); };
  }, []));

  const loadSubjects = async () => {
    try {
      setSubLoading(true);
      const r = await API.get("/subject-requests/my-subjects");
      setSubjects(r.data?.subjects || []);
    } catch { setSubjects([]); }
    finally { setSubLoading(false); }
  };

  const selectSubject = async (subject) => {
    setSelectedSubject(subject);
    setAttendance({});
    setAlreadyMarked(false);
    setStuLoading(true);
    try {
      const r = await API.get(`/subject-requests/${subject._id}/students`);
      const studs = r.data?.students || [];
      setStudents(studs);
      // Default all = absent
      const init = {};
      studs.forEach(s => { init[s._id] = "absent"; });
      setAttendance(init);

      // Check if today's attendance already marked
      try {
        const ar = await API.get(`/attendance/check?subjectId=${subject._id}&date=${date}`);
        if (ar.data?.marked) {
          setAlreadyMarked(true);
          // Pre-fill existing attendance
          const existing = {};
          ar.data.records?.forEach(r => { existing[r.studentId] = r.status; });
          setAttendance(existing);
        }
      } catch {}
    } catch { setStudents([]); }
    finally { setStuLoading(false); }
  };

  const toggleAttendance = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const all = {};
    students.forEach(s => { all[s._id] = status; });
    setAttendance(all);
  };

  const presentCount = Object.values(attendance).filter(v => v==="present").length;
  const absentCount  = Object.values(attendance).filter(v => v==="absent").length;

  const handleSubmit = async () => {
    if (students.length === 0) return;
    const unmarked = students.filter(s => !attendance[s._id]);
    if (unmarked.length > 0) {
      Alert.alert("Incomplete", `${unmarked.length} students not marked. Mark all before submitting.`);
      return;
    }

    Alert.alert(
      "Submit Attendance",
      `Present: ${presentCount} | Absent: ${absentCount}\n\nSubmit attendance for ${selectedSubject?.subjectName}?`,
      [
        { text:"Cancel", style:"cancel" },
        { text:"Submit", onPress: async () => {
          try {
            setSubmitting(true);
            const records = students.map(s => ({
              studentId: s._id,
              status:    attendance[s._id] || "absent",
            }));
            await API.post("/attendance/mark", {
              subjectId:    selectedSubject?.subjectId?._id || selectedSubject._id,
              subjectName:  selectedSubject.subjectName,
              department:   selectedSubject.department,
              semester:     selectedSubject.semester,
              admissionYear:selectedSubject.admissionYear,
              date,
              records,
            });
            Alert.alert("✅ Done!","Attendance submitted successfully!",[
              { text:"OK", onPress:()=>{ setSelectedSubject(null); setStudents([]); setAttendance({}); } }
            ]);
          } catch(e) {
            Alert.alert("Error", e.response?.data?.message || "Could not submit attendance");
          } finally { setSubmitting(false); }
        }},
      ]
    );
  };

  // ── STEP 1: Subject Selection ──
  if (!selectedSubject) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>
        <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
          <Pressable onPress={()=>navigation.openDrawer()} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color="#fff"/>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mark Attendance</Text>
            <Text style={styles.headerSub}>Select a subject to begin</Text>
          </View>
          <View style={{width:40}}/>
        </LinearGradient>

        {subLoading
          ? <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b"/></View>
          : subjects.length === 0
            ? (
              <View style={styles.center}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="book-outline" size={40} color="#374151"/>
                </View>
                <Text style={styles.emptyTitle}>No Accepted Subjects</Text>
                <Text style={styles.emptySubtitle}>Request subjects from the Students tab and wait for admin approval.</Text>
                <Pressable style={styles.goBtn} onPress={()=>navigation.navigate("students")}>
                  <Text style={styles.goBtnText}>Go to My Subjects →</Text>
                </Pressable>
              </View>
            )
            : (
              <FlatList
                data={subjects}
                keyExtractor={item=>item._id}
                contentContainerStyle={{ padding:16, paddingBottom:40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSubjects} tintColor="#f59e0b"/>}
                ListHeaderComponent={() => (
                  <View style={styles.stepCard}>
                    <View style={styles.stepDot}><Text style={styles.stepNum}>1</Text></View>
                    <View>
                      <Text style={styles.stepTitle}>Choose Subject</Text>
                      <Text style={styles.stepSub}>Tap a subject to start marking attendance</Text>
                    </View>
                  </View>
                )}
                renderItem={({item}) => (
                  <SubjectCard
                    item={item}
                    isSelected={false}
                    onPress={() => selectSubject(item)}
                  />
                )}
              />
            )
        }
      </View>
    );
  }

  // ── STEP 2: Mark Attendance ──
  const color    = getColor(selectedSubject.department);
  const short    = selectedSubject.department?.match(/\(([^)]+)\)/)?.[1] || selectedSubject.department?.split(" ")[0] || "";
  const section  = `${short} ${selectedSubject.admissionYear}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>

      {/* Header */}
      <LinearGradient colors={["#0a0f1e","#1a2a3a"]} style={styles.header}>
        <Pressable onPress={()=>{ setSelectedSubject(null); setStudents([]); setAttendance({}); }} style={styles.menuBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selectedSubject.subjectName}</Text>
          <Text style={styles.headerSub}>{section} · Sem {selectedSubject.semester}</Text>
        </View>
        <View style={{width:40}}/>
      </LinearGradient>

      {stuLoading
        ? <View style={styles.center}><ActivityIndicator size="large" color={color}/></View>
        : (
          <FlatList
            data={students}
            keyExtractor={item=>item._id}
            contentContainerStyle={{ padding:16, paddingBottom:100 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <>
                {/* Subject Info Banner */}
                <LinearGradient colors={[color+"30", color+"10"]} style={styles.subjectBanner}>
                  <View style={[styles.subjectIconBox,{backgroundColor:color+"22",marginRight:12}]}>
                    <Ionicons name="book" size={20} color={color}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[styles.subjectName,{fontSize:15}]}>{selectedSubject.subjectName}</Text>
                    <Text style={styles.subjectCode}>{section} · Sem {selectedSubject.semester}</Text>
                  </View>
                  {alreadyMarked && (
                    <View style={styles.alreadyBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#34d399"/>
                      <Text style={styles.alreadyBadgeText}>Marked</Text>
                    </View>
                  )}
                </LinearGradient>

                {/* Date + Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={13} color="#64748b"/>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                  <View style={styles.countBadges}>
                    <View style={[styles.countBadge,{backgroundColor:"rgba(52,211,153,0.15)"}]}>
                      <Text style={[styles.countNum,{color:"#34d399"}]}>{presentCount}</Text>
                      <Text style={styles.countLabel}>Present</Text>
                    </View>
                    <View style={[styles.countBadge,{backgroundColor:"rgba(248,113,113,0.15)"}]}>
                      <Text style={[styles.countNum,{color:"#f87171"}]}>{absentCount}</Text>
                      <Text style={styles.countLabel}>Absent</Text>
                    </View>
                    <View style={[styles.countBadge,{backgroundColor:"rgba(100,116,139,0.15)"}]}>
                      <Text style={[styles.countNum,{color:"#64748b"}]}>{students.length}</Text>
                      <Text style={styles.countLabel}>Total</Text>
                    </View>
                  </View>
                </View>

                {/* Mark all buttons */}
                <View style={styles.markAllRow}>
                  <Pressable style={styles.markAllPresent} onPress={()=>markAll("present")}>
                    <Ionicons name="checkmark-done" size={14} color="#34d399"/>
                    <Text style={[styles.markAllText,{color:"#34d399"}]}>All Present</Text>
                  </Pressable>
                  <Pressable style={styles.markAllAbsent} onPress={()=>markAll("absent")}>
                    <Ionicons name="close" size={14} color="#f87171"/>
                    <Text style={[styles.markAllText,{color:"#f87171"}]}>All Absent</Text>
                  </Pressable>
                </View>

                {students.length === 0 && (
                  <View style={[styles.emptyIcon,{alignSelf:"center",marginTop:40}]}>
                    <Ionicons name="people-outline" size={40} color="#374151"/>
                    <Text style={[styles.emptyTitle,{marginTop:12}]}>No Students Found</Text>
                    <Text style={styles.emptySubtitle}>No students in {section} Sem {selectedSubject.semester}</Text>
                  </View>
                )}

                {students.length > 0 && (
                  <Text style={styles.sectionLabel}>STUDENTS ({students.length})</Text>
                )}
              </>
            )}
            renderItem={({item}) => (
              <StudentRow
                item={item}
                status={attendance[item._id]}
                onToggle={toggleAttendance}
              />
            )}
            ListFooterComponent={() =>
              students.length > 0 ? (
                <Pressable
                  style={[styles.submitBtn, submitting&&{opacity:0.6}]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={alreadyMarked ? ["#f59e0b","#d97706"] : ["#34d399","#059669"]}
                    start={{x:0,y:0}} end={{x:1,y:0}}
                    style={styles.submitGrad}
                  >
                    {submitting
                      ? <ActivityIndicator color="#fff"/>
                      : <>
                          <Ionicons name={alreadyMarked?"refresh":"checkmark-circle"} size={18} color="#fff"/>
                          <Text style={styles.submitText}>
                            {alreadyMarked ? "Update Attendance" : "Submit Attendance"}
                          </Text>
                        </>
                    }
                  </LinearGradient>
                </Pressable>
              ) : null
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1,backgroundColor:"#080d17" },
  center:{ flex:1,justifyContent:"center",alignItems:"center",paddingHorizontal:32 },
  header:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,paddingTop:52,paddingBottom:14 },
  menuBtn:{ width:40,height:40,borderRadius:12,backgroundColor:"rgba(255,255,255,0.08)",justifyContent:"center",alignItems:"center" },
  headerCenter:{ flex:1,alignItems:"center" },
  headerTitle:{ color:"#fff",fontSize:17,fontWeight:"700" },
  headerSub:{ color:"#64748b",fontSize:11,marginTop:2 },
  // Step card
  stepCard:{ flexDirection:"row",alignItems:"center",gap:14,backgroundColor:"#1a2535",borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:"rgba(245,158,11,0.2)" },
  stepDot:{ width:36,height:36,borderRadius:18,backgroundColor:"rgba(245,158,11,0.2)",justifyContent:"center",alignItems:"center" },
  stepNum:{ color:"#f59e0b",fontSize:16,fontWeight:"800" },
  stepTitle:{ color:"#fff",fontSize:14,fontWeight:"700" },
  stepSub:{ color:"#64748b",fontSize:12,marginTop:2 },
  // Subject card
  subjectCard:{ borderRadius:16,marginBottom:10,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  subjectGrad:{ flexDirection:"row",alignItems:"center",padding:14,gap:12,borderRadius:16 },
  subjectIconBox:{ width:44,height:44,borderRadius:12,justifyContent:"center",alignItems:"center" },
  subjectName:{ color:"#fff",fontSize:14,fontWeight:"700" },
  subjectCode:{ color:"#64748b",fontSize:11,marginTop:2 },
  subjectMeta:{ flexDirection:"row",gap:6,marginTop:6,flexWrap:"wrap" },
  metaBadge:{ paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:"rgba(255,255,255,0.06)" },
  metaBadgeText:{ fontSize:10,fontWeight:"700",color:"#64748b" },
  // Subject banner (step 2)
  subjectBanner:{ flexDirection:"row",alignItems:"center",borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:"rgba(255,255,255,0.06)" },
  alreadyBadge:{ flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(52,211,153,0.15)",paddingHorizontal:8,paddingVertical:4,borderRadius:8 },
  alreadyBadgeText:{ color:"#34d399",fontSize:10,fontWeight:"700" },
  // Stats
  statsRow:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10 },
  dateBadge:{ flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#1a2535",paddingHorizontal:12,paddingVertical:8,borderRadius:10 },
  dateText:{ color:"#94a3b8",fontSize:12,fontWeight:"600" },
  countBadges:{ flexDirection:"row",gap:8 },
  countBadge:{ alignItems:"center",paddingHorizontal:12,paddingVertical:6,borderRadius:10 },
  countNum:{ fontSize:16,fontWeight:"800" },
  countLabel:{ color:"#64748b",fontSize:9,marginTop:2,fontWeight:"600" },
  // Mark all
  markAllRow:{ flexDirection:"row",gap:10,marginBottom:16 },
  markAllPresent:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(52,211,153,0.1)",padding:11,borderRadius:12,borderWidth:1,borderColor:"rgba(52,211,153,0.2)" },
  markAllAbsent:{ flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,backgroundColor:"rgba(248,113,113,0.1)",padding:11,borderRadius:12,borderWidth:1,borderColor:"rgba(248,113,113,0.2)" },
  markAllText:{ fontSize:13,fontWeight:"700" },
  sectionLabel:{ color:"#374151",fontSize:10,fontWeight:"800",letterSpacing:1,marginBottom:10 },
  // Student row
  studentRow:{ flexDirection:"row",alignItems:"center",backgroundColor:"#1a2535",borderRadius:14,padding:12,marginBottom:8,borderWidth:1,borderColor:"rgba(255,255,255,0.04)" },
  studentAvatar:{ width:42,height:42,borderRadius:21,justifyContent:"center",alignItems:"center",marginRight:12 },
  studentAvatarImg:{ width:42,height:42,borderRadius:21 },
  studentAvatarText:{ fontSize:15,fontWeight:"800" },
  studentInfo:{ flex:1 },
  studentName:{ color:"#fff",fontSize:14,fontWeight:"600" },
  studentId:{ color:"#64748b",fontSize:11,marginTop:2 },
  attendanceBtns:{ flexDirection:"row",gap:8 },
  attBtn:{ width:38,height:38,borderRadius:19,justifyContent:"center",alignItems:"center",backgroundColor:"rgba(255,255,255,0.04)" },
  presentBtn:{ backgroundColor:"rgba(52,211,153,0.12)" },
  absentBtn:{ backgroundColor:"rgba(248,113,113,0.12)" },
  // Submit
  submitBtn:{ marginTop:16,borderRadius:16,overflow:"hidden" },
  submitGrad:{ flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:18,borderRadius:16 },
  submitText:{ color:"#fff",fontWeight:"800",fontSize:16 },
  // Empty
  emptyIcon:{ alignItems:"center",gap:8 },
  emptyTitle:{ color:"#374151",fontSize:16,fontWeight:"700",textAlign:"center" },
  emptySubtitle:{ color:"#1f2937",fontSize:13,textAlign:"center",marginTop:4,lineHeight:18 },
  goBtn:{ marginTop:20,backgroundColor:"rgba(245,158,11,0.15)",paddingHorizontal:20,paddingVertical:12,borderRadius:12,borderWidth:1,borderColor:"rgba(245,158,11,0.3)" },
  goBtnText:{ color:"#f59e0b",fontWeight:"700",fontSize:14 },
});