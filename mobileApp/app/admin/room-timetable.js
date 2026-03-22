// app/admin/room-timetable.js
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };
const DAY_COLORS= {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#fbbf24", Friday:"#f87171", Saturday:"#fb923c",
};

const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push({
    label:     `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM":"AM"}`,
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
  });
}

// ─── Conflict Card ───
const ConflictCard = ({ conflict }) => (
  <View style={styles.conflictCard}>
    <View style={styles.conflictLeft}>
      <Ionicons name="warning" size={16} color="#f87171" />
    </View>
    <View style={{ flex:1 }}>
      <Text style={styles.conflictTitle}>{conflict.type}</Text>
      <Text style={styles.conflictDesc}>{conflict.message}</Text>
      <View style={styles.conflictMeta}>
        <Ionicons name="calendar-outline" size={10} color="#64748b"/>
        <Text style={styles.conflictMetaText}>{conflict.day} · {conflict.time}</Text>
      </View>
    </View>
  </View>
);

// ─── Room Cell ───
const RoomCell = ({ slot, onPress }) => {
  if (!slot) return <View style={styles.emptyCell}/>;
  const color = DAY_COLORS[slot.day] || "#64748b";
  return (
    <Pressable style={[styles.filledCell, { borderLeftColor: color }]} onPress={()=>onPress(slot)}>
      <Text style={styles.cellSubject} numberOfLines={1}>{slot.subjectName}</Text>
      <Text style={styles.cellTeacher} numberOfLines={1}>{slot.teacherName}</Text>
      <View style={[styles.cellBadge, { backgroundColor: color+"18" }]}>
        <Text style={[styles.cellBadgeText, { color }]}>Sem {slot.semester}</Text>
      </View>
    </Pressable>
  );
};

export default function RoomTimetable() {
  const router = useRouter();

  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms,      setRooms]      = useState([]);      // unique rooms
  const [conflicts,  setConflicts]  = useState([]);
  const [roomMap,    setRoomMap]    = useState({});      // { room: { day_time: slot } }
  const [activeDay,  setActiveDay]  = useState("Monday");
  const [search,     setSearch]     = useState("");
  const [selSlot,    setSelSlot]    = useState(null);
  const [detailModal,setDetailModal]= useState(false);
  const [view,       setView]       = useState("room");  // "room" | "conflict"

  useFocusEffect(useCallback(()=>{ loadData(); },[]) );

  const loadData = async (isRefresh=false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subject-requests", { params:{ status:"accepted" } });
      const accepted = res.data?.requests || [];
      setRequests(accepted);
      buildRoomMap(accepted);
      buildConflicts(accepted);
    } catch(e) {
      console.log("Room timetable load error:", e.message);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const buildRoomMap = (accepted) => {
    const map    = {};
    const roomSet= new Set();

    accepted.forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const room = slot.room?.trim();
        if (!room) return;
        roomSet.add(room);
        if (!map[room]) map[room] = {};
        const key = `${slot.day}_${slot.startTime}`;
        map[room][key] = {
          subjectName: r.subjectName,
          teacherName: r.teacherName,
          department:  r.department,
          semester:    r.semester,
          section:     r.section,
          admissionYear: r.admissionYear,
          day:         slot.day,
          startTime:   slot.startTime,
          endTime:     slot.endTime,
          room,
        };
      });
    });
    setRooms([...roomSet].sort());
    setRoomMap(map);
  };

  const buildConflicts = (accepted) => {
    const found = [];

    // Check room conflicts
    const roomTimeMap = {};
    accepted.forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const room = slot.room?.trim();
        if (!room) return;
        const key = `${slot.day}_${slot.startTime}_${room}`;
        if (roomTimeMap[key]) {
          found.push({
            type:    "Room Conflict 🏫",
            message: `Room ${room}: "${r.subjectName}" (${r.teacherName}) AND "${roomTimeMap[key].subjectName}" (${roomTimeMap[key].teacherName}) — same room, same time!`,
            day:     slot.day,
            time:    slot.startTime,
          });
        } else {
          roomTimeMap[key] = r;
        }
      });
    });

    // Check teacher conflicts
    const teacherTimeMap = {};
    accepted.forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const key = `${r.teacherId}_${slot.day}_${slot.startTime}`;
        if (teacherTimeMap[key]) {
          found.push({
            type:    "Teacher Conflict 👨‍🏫",
            message: `${r.teacherName}: teaching "${r.subjectName}" AND "${teacherTimeMap[key].subjectName}" at the same time!`,
            day:     slot.day,
            time:    slot.startTime,
          });
        } else {
          teacherTimeMap[key] = r;
        }
      });
    });

    // Check batch conflicts
    const batchTimeMap = {};
    accepted.forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const key = `${r.college}_${r.department}_${r.semester}_${r.admissionYear}_${r.section}_${slot.day}_${slot.startTime}`;
        if (batchTimeMap[key]) {
          found.push({
            type:    "Batch Conflict 🎓",
            message: `Sem ${r.semester} Batch ${r.admissionYear}: students have "${r.subjectName}" AND "${batchTimeMap[key].subjectName}" at the same time!`,
            day:     slot.day,
            time:    slot.startTime,
          });
        } else {
          batchTimeMap[key] = r;
        }
      });
    });

    setConflicts(found);
  };

  const filteredRooms = rooms.filter(r =>
    !search || r.toLowerCase().includes(search.toLowerCase())
  );

  const totalSlots = (room) =>
    Object.keys(roomMap[room]||{}).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17"/>

      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={()=>router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Room Timetable</Text>
          <Text style={styles.headerSub}>{rooms.length} rooms · {conflicts.length > 0 ? `⚠️ ${conflicts.length} conflicts` : "No conflicts"}</Text>
        </View>
        <View style={{ width:40 }}/>
      </LinearGradient>

      {/* View toggle */}
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleBtn, view==="room" && styles.toggleActive]}
          onPress={()=>setView("room")}>
          <Ionicons name="grid-outline" size={15} color={view==="room"?"#00c6ff":"#64748b"}/>
          <Text style={[styles.toggleText, view==="room"&&{color:"#00c6ff"}]}>Rooms</Text>
        </Pressable>
        <Pressable style={[styles.toggleBtn, view==="conflict" && styles.toggleActiveRed]}
          onPress={()=>setView("conflict")}>
          <Ionicons name="warning-outline" size={15} color={view==="conflict"?"#f87171":"#64748b"}/>
          <Text style={[styles.toggleText, view==="conflict"&&{color:"#f87171"}]}>
            Conflicts {conflicts.length>0 && `(${conflicts.length})`}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff"/></View>
      ) : view === "conflict" ? (
        // ── Conflict View ──
        <ScrollView contentContainerStyle={{ padding:16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadData(true)} tintColor="#f87171"/>}>
          {conflicts.length === 0 ? (
            <View style={styles.noConflict}>
              <Ionicons name="checkmark-circle" size={48} color="#34d399"/>
              <Text style={styles.noConflictTitle}>No Conflicts Found! ✅</Text>
              <Text style={styles.noConflictSub}>All timetables are properly assigned.</Text>
            </View>
          ) : (
            <>
              <View style={styles.conflictSummary}>
                <Ionicons name="warning" size={14} color="#f87171"/>
                <Text style={styles.conflictSummaryText}>
                  {conflicts.length} conflict{conflicts.length>1?"s":""} detected — fix them to avoid scheduling issues
                </Text>
              </View>
              {conflicts.map((c,i) => <ConflictCard key={i} conflict={c}/>)}
            </>
          )}
        </ScrollView>
      ) : (
        // ── Room View ──
        <>
          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color="#64748b"/>
            <TextInput style={styles.searchInput} placeholder="Search room..."
              placeholderTextColor="#374151" value={search}
              onChangeText={setSearch}/>
            {search.length>0 && (
              <Pressable onPress={()=>setSearch("")}>
                <Ionicons name="close-circle" size={15} color="#64748b"/>
              </Pressable>
            )}
          </View>

          {/* Day tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.dayTabsScroll} contentContainerStyle={styles.dayTabsContent}>
            {DAYS.map(day=>{
              const color  = DAY_COLORS[day];
              const isAct  = activeDay===day;
              // Count total slots this day across all rooms
              let dayTotal = 0;
              rooms.forEach(r => {
                TIME_SLOTS.forEach(s => {
                  if (roomMap[r]?.[`${day}_${s.startTime}`]) dayTotal++;
                });
              });
              return (
                <Pressable key={day}
                  style={[styles.dayTab, isAct&&{backgroundColor:color+"20",borderColor:color+"55"}]}
                  onPress={()=>setActiveDay(day)}>
                  <Text style={[styles.dayTabText, isAct&&{color}]}>{DAY_SHORT[day]}</Text>
                  {dayTotal>0&&(
                    <View style={[styles.dayBadge, {backgroundColor:isAct?color:"rgba(255,255,255,0.08)"}]}>
                      <Text style={[styles.dayBadgeText, {color:isAct?"#000":"#64748b"}]}>{dayTotal}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Room Grid */}
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadData(true)} tintColor="#00c6ff"/>}
            contentContainerStyle={{ paddingBottom:40 }}>

            {filteredRooms.length===0 ? (
              <View style={styles.center}>
                <Ionicons name="business-outline" size={44} color="#374151"/>
                <Text style={styles.emptyTitle}>No rooms assigned yet</Text>
                <Text style={styles.emptySub}>Assign rooms when accepting subject requests</Text>
              </View>
            ) : (
              filteredRooms.map(room=>{
                const slots = roomMap[room]||{};
                return (
                  <View key={room} style={styles.roomSection}>
                    {/* Room header */}
                    <View style={styles.roomHeader}>
                      <View style={styles.roomIconBox}>
                        <Ionicons name="business" size={16} color="#00c6ff"/>
                      </View>
                      <Text style={styles.roomName}>{room}</Text>
                      <View style={styles.roomSlotBadge}>
                        <Text style={styles.roomSlotText}>{totalSlots(room)} classes/week</Text>
                      </View>
                    </View>

                    {/* Time slots for this room on active day */}
                    <View style={styles.roomSlots}>
                      {TIME_SLOTS.map(ts=>{
                        const key  = `${activeDay}_${ts.startTime}`;
                        const slot = slots[key];
                        return (
                          <View key={key} style={styles.timeRow}>
                            <Text style={styles.timeLabel}>{ts.label}</Text>
                            {slot ? (
                              <Pressable style={styles.occupiedSlot}
                                onPress={()=>{ setSelSlot(slot); setDetailModal(true); }}>
                                <View style={[styles.occupiedStrip, { backgroundColor: DAY_COLORS[activeDay] }]}/>
                                <View style={{ flex:1 }}>
                                  <Text style={styles.occupiedSubject} numberOfLines={1}>{slot.subjectName}</Text>
                                  <Text style={styles.occupiedTeacher} numberOfLines={1}>{slot.teacherName}</Text>
                                </View>
                                <View style={[styles.semChip, { backgroundColor: DAY_COLORS[activeDay]+"18" }]}>
                                  <Text style={[styles.semChipText, { color: DAY_COLORS[activeDay] }]}>
                                    S{slot.semester}
                                  </Text>
                                </View>
                              </Pressable>
                            ) : (
                              <View style={styles.freeSlot}>
                                <Text style={styles.freeSlotText}>Free</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* Slot Detail Modal */}
      <Modal visible={detailModal} transparent animationType="slide"
        onRequestClose={()=>setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{flex:1}} onPress={()=>setDetailModal(false)}/>
          <View style={styles.detailSheet}>
            <View style={styles.handle}/>
            {selSlot && (
              <>
                <View style={[styles.detailHeader, { backgroundColor: DAY_COLORS[selSlot.day]+"15" }]}>
                  <View style={[styles.detailRoomBadge, { backgroundColor: DAY_COLORS[selSlot.day]+"22" }]}>
                    <Ionicons name="business" size={18} color={DAY_COLORS[selSlot.day]}/>
                    <Text style={[styles.detailRoomText, { color: DAY_COLORS[selSlot.day] }]}>
                      Room {selSlot.room}
                    </Text>
                  </View>
                  <Text style={styles.detailSubject}>{selSlot.subjectName}</Text>
                  <View style={styles.detailTimeRow}>
                    <Ionicons name="time-outline" size={13} color="#64748b"/>
                    <Text style={styles.detailTime}>
                      {selSlot.day} · {selSlot.startTime} — {selSlot.endTime}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailBody}>
                  {[
                    { icon:"person-outline",    label:"Teacher",       value: selSlot.teacherName, color:"#f59e0b" },
                    { icon:"school-outline",    label:"Department",    value: selSlot.department,  color:"#a78bfa" },
                    { icon:"layers-outline",    label:"Semester",      value: `Semester ${selSlot.semester}`, color:"#00c6ff" },
                    { icon:"calendar-outline",  label:"Batch",         value: selSlot.admissionYear, color:"#34d399" },
                    { icon:"people-outline",    label:"Section",       value: selSlot.section || "All", color:"#fb923c" },
                  ].map((row,i)=>(
                    <View key={i} style={styles.detailRow}>
                      <View style={[styles.detailRowIcon, { backgroundColor: row.color+"18" }]}>
                        <Ionicons name={row.icon} size={14} color={row.color}/>
                      </View>
                      <View>
                        <Text style={styles.detailRowLabel}>{row.label}</Text>
                        <Text style={styles.detailRowValue}>{row.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable style={styles.detailClose} onPress={()=>setDetailModal(false)}>
                  <Text style={styles.detailCloseText}>Close</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex:1, backgroundColor:"#080d17" },
  center:           { flex:1, justifyContent:"center", alignItems:"center", paddingTop:60, gap:12 },
  header:           { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:          { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:     { flex:1, alignItems:"center" },
  headerTitle:      { color:"#fff", fontSize:18, fontWeight:"800" },
  headerSub:        { color:"#64748b", fontSize:11, marginTop:2 },

  toggleRow:        { flexDirection:"row", gap:10, marginHorizontal:16, marginTop:10, marginBottom:6 },
  toggleBtn:        { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:10, borderRadius:12, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  toggleActive:     { backgroundColor:"rgba(0,198,255,0.1)", borderColor:"rgba(0,198,255,0.3)" },
  toggleActiveRed:  { backgroundColor:"rgba(248,113,113,0.1)", borderColor:"rgba(248,113,113,0.3)" },
  toggleText:       { color:"#64748b", fontSize:13, fontWeight:"700" },

  searchBar:        { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#0f1720", marginHorizontal:16, marginTop:4, marginBottom:8, borderRadius:12, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:"rgba(255,255,255,0.04)" },
  searchInput:      { flex:1, color:"#fff", fontSize:14, paddingVertical:0 },

  dayTabsScroll:    { marginBottom:8 },
  dayTabsContent:   { paddingHorizontal:16, gap:8, alignItems:"center" },
  dayTab:           { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:"#0f1720", borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  dayTabText:       { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayBadge:         { paddingHorizontal:6, paddingVertical:2, borderRadius:8, minWidth:20, alignItems:"center" },
  dayBadgeText:     { fontSize:9, fontWeight:"800" },

  roomSection:      { marginHorizontal:16, marginBottom:16, backgroundColor:"#0f1923", borderRadius:16, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomHeader:       { flexDirection:"row", alignItems:"center", gap:10, padding:14, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)" },
  roomIconBox:      { width:34, height:34, borderRadius:10, backgroundColor:"rgba(0,198,255,0.12)", justifyContent:"center", alignItems:"center" },
  roomName:         { color:"#fff", fontSize:15, fontWeight:"800", flex:1 },
  roomSlotBadge:    { backgroundColor:"rgba(0,198,255,0.12)", paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  roomSlotText:     { color:"#00c6ff", fontSize:10, fontWeight:"700" },

  roomSlots:        { padding:12, gap:6 },
  timeRow:          { flexDirection:"row", alignItems:"center", gap:8 },
  timeLabel:        { color:"#374151", fontSize:10, fontWeight:"600", width:60 },

  occupiedSlot:     { flex:1, flexDirection:"row", alignItems:"center", backgroundColor:"rgba(255,255,255,0.05)", borderRadius:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", minHeight:44 },
  occupiedStrip:    { width:3, alignSelf:"stretch" },
  occupiedSubject:  { color:"#fff", fontSize:12, fontWeight:"700", paddingHorizontal:8, paddingTop:6 },
  occupiedTeacher:  { color:"#64748b", fontSize:10, paddingHorizontal:8, paddingBottom:6 },
  semChip:          { paddingHorizontal:8, paddingVertical:4, borderRadius:8, marginRight:8 },
  semChipText:      { fontSize:10, fontWeight:"800" },
  freeSlot:         { flex:1, height:36, borderRadius:10, backgroundColor:"rgba(255,255,255,0.02)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.03)", borderStyle:"dashed" },
  freeSlotText:     { color:"#1f2937", fontSize:10, fontWeight:"600" },

  emptyTitle:       { color:"#374151", fontSize:15, fontWeight:"700" },
  emptySub:         { color:"#1f2937", fontSize:12 },

  // Conflict
  conflictSummary:  { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(248,113,113,0.1)", padding:12, borderRadius:12, marginBottom:12, borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  conflictSummaryText:{ color:"#f87171", fontSize:12, fontWeight:"600", flex:1 },
  conflictCard:     { flexDirection:"row", backgroundColor:"#1a2535", borderRadius:14, marginBottom:10, overflow:"hidden", borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  conflictLeft:     { width:44, justifyContent:"center", alignItems:"center", backgroundColor:"rgba(248,113,113,0.1)" },
  conflictTitle:    { color:"#f87171", fontSize:13, fontWeight:"800", marginBottom:4 },
  conflictDesc:     { color:"#94a3b8", fontSize:12, lineHeight:18 },
  conflictMeta:     { flexDirection:"row", alignItems:"center", gap:4, marginTop:6 },
  conflictMetaText: { color:"#64748b", fontSize:10 },
  noConflict:       { alignItems:"center", paddingTop:60, gap:12 },
  noConflictTitle:  { color:"#34d399", fontSize:18, fontWeight:"800" },
  noConflictSub:    { color:"#64748b", fontSize:13 },

  // Detail Modal
  modalOverlay:     { flex:1, backgroundColor:"rgba(0,0,0,0.8)", justifyContent:"flex-end" },
  detailSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.75, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  handle:           { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:8 },
  detailHeader:     { padding:20, alignItems:"center", gap:8, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  detailRoomBadge:  { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:16, paddingVertical:8, borderRadius:20 },
  detailRoomText:   { fontSize:15, fontWeight:"800" },
  detailSubject:    { color:"#fff", fontSize:20, fontWeight:"900", textAlign:"center" },
  detailTimeRow:    { flexDirection:"row", alignItems:"center", gap:6 },
  detailTime:       { color:"#64748b", fontSize:12 },
  detailBody:       { padding:20, gap:12 },
  detailRow:        { flexDirection:"row", alignItems:"center", gap:12 },
  detailRowIcon:    { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center" },
  detailRowLabel:   { color:"#64748b", fontSize:10, fontWeight:"600" },
  detailRowValue:   { color:"#fff", fontSize:14, fontWeight:"700", marginTop:2 },
  detailClose:      { margin:16, marginTop:4, padding:14, backgroundColor:"rgba(255,255,255,0.05)", borderRadius:12, alignItems:"center" },
  detailCloseText:  { color:"#64748b", fontSize:14, fontWeight:"700" },
});