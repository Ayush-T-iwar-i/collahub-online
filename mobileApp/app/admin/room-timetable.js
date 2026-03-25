// app/admin/room-timetable.js
import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, StatusBar, RefreshControl,
  TextInput, Modal, Alert, Dimensions, FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const { width, height } = Dimensions.get("window");

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };
const DAY_COLORS= {
  Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399",
  Thursday:"#fbbf24", Friday:"#f87171", Saturday:"#fb923c",
};

const ROOM_TYPES = [
  { key:"Lecture",  icon:"school-outline",       color:"#00c6ff", label:"Lecture Room" },
  { key:"Lab",      icon:"flask-outline",         color:"#34d399", label:"Lab"          },
  { key:"Theater",  icon:"business-outline",      color:"#a78bfa", label:"Lecture Theater" },
  { key:"Seminar",  icon:"mic-outline",           color:"#f59e0b", label:"Seminar Hall" },
  { key:"Other",    icon:"cube-outline",          color:"#64748b", label:"Other"        },
];

const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push({
    label:     `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM":"AM"}`,
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
  });
}

const ROOM_TYPE_COLOR = (type) =>
  ROOM_TYPES.find(r=>r.key===type)?.color || "#64748b";

const ROOM_TYPE_ICON = (type) =>
  ROOM_TYPES.find(r=>r.key===type)?.icon || "cube-outline";

export default function RoomTimetable() {
  const router = useRouter();

  const [adminCollege, setAdminCollege] = useState("");
  const [rooms,        setRooms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  // Timetable data from subject requests
  const [roomMap,      setRoomMap]      = useState({});   // { roomName: { "day_startTime": slot } }
  const [conflicts,    setConflicts]    = useState([]);

  // View: "rooms" | "timetable" | "conflicts"
  const [view,         setView]         = useState("rooms");
  const [activeDay,    setActiveDay]    = useState("Monday");
  const [selectedRoom, setSelectedRoom] = useState(null);  // for timetable view
  const [search,       setSearch]       = useState("");

  // Add/Edit room modal
  const [roomModal,    setRoomModal]    = useState(false);
  const [editingRoom,  setEditingRoom]  = useState(null);
  const [roomForm,     setRoomForm]     = useState({ name:"", type:"Lecture", capacity:"", building:"", floor:"" });
  const [savingRoom,   setSavingRoom]   = useState(false);

  // Slot detail modal
  const [selSlot,      setSelSlot]      = useState(null);
  const [detailModal,  setDetailModal]  = useState(false);

  // Load admin college
  const loadCollege = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("adminData");
      if (raw) {
        const d = JSON.parse(raw);
        setAdminCollege(d.college || d.user?.college || "");
        return d.college || d.user?.college || "";
      }
    } catch {}
    return "";
  }, []);

  useEffect(() => { loadCollege(); }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      const col = await loadCollege();
      if (col) { loadRooms(col); loadTimetableData(col); }
    })();
  }, []));

  const loadRooms = async (college, refresh=false) => {
    try {
      if (refresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/rooms", { params:{ college } });
      setRooms(res.data?.rooms || []);
    } catch(e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load rooms.");
    } finally { setLoading(false); setRefreshing(false); }
  };

  const loadTimetableData = async (college) => {
    try {
      const res = await API.get("/subject-requests", { params:{ status:"accepted" } });
      const accepted = res.data?.requests || [];
      buildRoomMap(accepted);
      buildConflicts(accepted, college);
    } catch(e) {
      console.log("Timetable load:", e.message);
    }
  };

  const buildRoomMap = (accepted) => {
    const map = {};
    accepted.forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const room = slot.room?.trim();
        if (!room) return;
        if (!map[room]) map[room] = {};
        const key = `${slot.day}_${slot.startTime}`;
        map[room][key] = {
          subjectName:   r.subjectName,
          teacherName:   r.teacherName,
          department:    r.department,
          semester:      r.semester,
          section:       r.section,
          admissionYear: r.admissionYear,
          day:           slot.day,
          startTime:     slot.startTime,
          endTime:       slot.endTime,
          room,
          college:       r.college,
        };
      });
    });
    setRoomMap(map);
  };

  const buildConflicts = (accepted, college) => {
    const found = [];
    const roomTimeMap = {};
    accepted.filter(r => r.college === college).forEach(r => {
      (r.timetable||[]).forEach(slot => {
        const room = slot.room?.trim();
        if (!room) return;
        const key = `${slot.day}_${slot.startTime}_${room}`;
        if (roomTimeMap[key]) {
          found.push({
            type:    "Room Conflict",
            message: `Room ${room}: "${r.subjectName}" (${r.teacherName}) conflicts with "${roomTimeMap[key].subjectName}"`,
            day:     slot.day,
            time:    slot.startTime,
          });
        } else { roomTimeMap[key] = r; }
      });
    });
    const teacherMap = {};
    accepted.filter(r=>r.college===college).forEach(r=>{
      (r.timetable||[]).forEach(slot=>{
        const key=`${r.teacherId}_${slot.day}_${slot.startTime}`;
        if(teacherMap[key]){
          found.push({type:"Teacher Double Booking",message:`${r.teacherName} is assigned to "${r.subjectName}" and "${teacherMap[key].subjectName}" at the same time.`,day:slot.day,time:slot.startTime});
        } else { teacherMap[key]=r; }
      });
    });
    setConflicts(found);
  };

  const handleAddRoom = async () => {
    if (!roomForm.name.trim()) return Alert.alert("Required","Room name is required.");
    setSavingRoom(true);
    try {
      if (editingRoom) {
        await API.put(`/rooms/${editingRoom._id}`, roomForm);
        Alert.alert("Updated!","Room updated successfully.");
      } else {
        await API.post("/rooms", roomForm);
        Alert.alert("Added!","Room added successfully.");
      }
      setRoomModal(false);
      setEditingRoom(null);
      setRoomForm({ name:"", type:"Lecture", capacity:"", building:"", floor:"" });
      loadRooms(adminCollege);
    } catch(e) {
      Alert.alert("Error", e.response?.data?.message || "Could not save room.");
    } finally { setSavingRoom(false); }
  };

  const handleDeleteRoom = (room) => {
    Alert.alert("Delete Room", `Delete "${room.name}"? This cannot be undone.`, [
      { text:"Cancel", style:"cancel" },
      { text:"Delete", style:"destructive", onPress: async () => {
        try {
          await API.delete(`/rooms/${room._id}`);
          setRooms(prev => prev.filter(r=>r._id!==room._id));
        } catch(e) { Alert.alert("Error", e.response?.data?.message||"Failed to delete."); }
      }},
    ]);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setRoomForm({
      name:room.name, type:room.type||"Lecture",
      capacity:String(room.capacity||""),
      building:room.building||"", floor:room.floor||"",
    });
    setRoomModal(true);
  };

  const openAdd = () => {
    setEditingRoom(null);
    setRoomForm({ name:"", type:"Lecture", capacity:"", building:"", floor:"" });
    setRoomModal(true);
  };

  const filteredRooms = rooms.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  const slotCount = (roomName) =>
    Object.keys(roomMap[roomName]||{}).length;

  const refresh = async () => {
    setRefreshing(true);
    await loadRooms(adminCollege, true);
    await loadTimetableData(adminCollege);
    setRefreshing(false);
  };

  // ── Room Card ────────────────────────────────────────
  const RoomCard = ({ room }) => {
    const color  = ROOM_TYPE_COLOR(room.type);
    const icon   = ROOM_TYPE_ICON(room.type);
    const slots  = slotCount(room.name);
    return (
      <Pressable style={styles.roomCard}
        onLongPress={() => openEdit(room)}
        onPress={() => { setSelectedRoom(room); setActiveDay("Monday"); setView("timetable"); }}>
        <View style={[styles.roomCardLeft, { backgroundColor: color+"15", borderColor: color+"30" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.roomCardBody}>
          <View style={styles.roomCardTop}>
            <Text style={styles.roomCardName}>{room.name}</Text>
            <View style={[styles.roomTypeBadge, { backgroundColor: color+"15", borderColor: color+"35" }]}>
              <Text style={[styles.roomTypeBadgeText, { color }]}>{room.type}</Text>
            </View>
          </View>
          <View style={styles.roomCardMeta}>
            {room.building ? (
              <View style={styles.roomMetaItem}>
                <Ionicons name="business-outline" size={11} color="#64748b"/>
                <Text style={styles.roomMetaText}>{room.building}{room.floor?`, ${room.floor}`:""}</Text>
              </View>
            ) : null}
            {room.capacity > 0 ? (
              <View style={styles.roomMetaItem}>
                <Ionicons name="people-outline" size={11} color="#64748b"/>
                <Text style={styles.roomMetaText}>Cap: {room.capacity}</Text>
              </View>
            ) : null}
            <View style={styles.roomMetaItem}>
              <Ionicons name="calendar-outline" size={11} color={slots>0?"#34d399":"#374151"}/>
              <Text style={[styles.roomMetaText, slots>0&&{color:"#34d399"}]}>
                {slots} class{slots!==1?"es":""}/week
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.roomCardActions}>
          <Pressable style={styles.roomActionBtn} onPress={() => openEdit(room)}>
            <Ionicons name="pencil" size={13} color="#f59e0b"/>
          </Pressable>
          <Pressable style={[styles.roomActionBtn,{backgroundColor:"rgba(248,113,113,0.1)"}]}
            onPress={() => handleDeleteRoom(room)}>
            <Ionicons name="trash" size={13} color="#f87171"/>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content"/>

      {/* ── Sticky Header ── */}
      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={() => view!=="rooms" ? setView("rooms") : router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {view==="timetable" && selectedRoom ? selectedRoom.name : "Room Timetable"}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {adminCollege ? adminCollege.split(" ").slice(0,4).join(" ") : "Loading..."}
            {view==="rooms" ? ` · ${rooms.length} rooms` : ""}
            {view==="conflicts" && conflicts.length>0 ? ` · ⚠️ ${conflicts.length} conflicts` : ""}
          </Text>
        </View>
        <Pressable onPress={openAdd}
          style={[styles.addBtn,{backgroundColor:"rgba(52,211,153,0.12)",borderColor:"rgba(52,211,153,0.3)"}]}>
          <Ionicons name="add" size={22} color="#34d399"/>
        </Pressable>
      </LinearGradient>

      {/* ── View tabs ── */}
      <View style={styles.viewTabs}>
        {[
          { key:"rooms",     icon:"business-outline",  label:"Rooms",     color:"#00c6ff" },
          { key:"conflicts", icon:"warning-outline",   label:`Conflicts${conflicts.length>0?` (${conflicts.length})`:""}`, color:"#f87171" },
        ].map(tab => {
          const active = view===tab.key || (view==="timetable"&&tab.key==="rooms");
          return (
            <Pressable key={tab.key} onPress={()=>setView(tab.key)}
              style={[styles.viewTab, active&&{backgroundColor:tab.color+"15",borderColor:tab.color+"40"}]}>
              <Ionicons name={tab.icon} size={15} color={active?tab.color:"#64748b"}/>
              <Text style={[styles.viewTabText, active&&{color:tab.color}]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#34d399"/>
          <Text style={styles.loaderText}>Loading rooms...</Text>
        </View>
      ) : (

        // ════════════════════════════════
        // VIEW: ROOMS LIST
        // ════════════════════════════════
        view==="rooms" ? (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={14} color="#64748b"/>
              <TextInput style={styles.searchInput} placeholder="Search rooms..."
                placeholderTextColor="#374151" value={search} onChangeText={setSearch}/>
              {!!search&&<Pressable onPress={()=>setSearch("")}><Ionicons name="close-circle" size={15} color="#64748b"/></Pressable>}
            </View>

            {/* Room type legend */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.legendRow}>
              {ROOM_TYPES.map(rt=>(
                <View key={rt.key} style={[styles.legendItem,{borderColor:rt.color+"30"}]}>
                  <Ionicons name={rt.icon} size={11} color={rt.color}/>
                  <Text style={[styles.legendText,{color:rt.color}]}>{rt.label}</Text>
                </View>
              ))}
            </ScrollView>

            <FlatList
              data={filteredRooms}
              keyExtractor={r=>r._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#34d399"/>}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}><Ionicons name="business-outline" size={40} color="#374151"/></View>
                  <Text style={styles.emptyTitle}>No rooms added yet</Text>
                  <Text style={styles.emptySub}>Tap + to add your first room</Text>
                  <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
                    <Ionicons name="add-circle-outline" size={16} color="#34d399"/>
                    <Text style={styles.emptyAddText}>Add Room</Text>
                  </Pressable>
                </View>
              }
              renderItem={({item})=><RoomCard room={item}/>}
            />
          </>
        )

        // ════════════════════════════════
        // VIEW: ROOM TIMETABLE
        // ════════════════════════════════
        : view==="timetable" && selectedRoom ? (
          <>
            {/* Day tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsRow} style={{maxHeight:52}}>
              {DAYS.map(day=>{
                const color = DAY_COLORS[day];
                const act   = activeDay===day;
                const key   = `${day}_`;
                const cnt   = Object.keys(roomMap[selectedRoom.name]||{}).filter(k=>k.startsWith(day)).length;
                return (
                  <Pressable key={day} onPress={()=>setActiveDay(day)}
                    style={[styles.dayTab, act&&{backgroundColor:color+"20",borderColor:color+"55"}]}>
                    <Text style={[styles.dayTabText, act&&{color}]}>{DAY_SHORT[day]}</Text>
                    {cnt>0&&<View style={[styles.dayDot,{backgroundColor:act?color:"rgba(255,255,255,0.2)"}]}/>}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Room info banner */}
            <View style={[styles.roomBanner, {borderColor:ROOM_TYPE_COLOR(selectedRoom.type)+"30"}]}>
              <View style={[styles.roomBannerIcon, {backgroundColor:ROOM_TYPE_COLOR(selectedRoom.type)+"18"}]}>
                <Ionicons name={ROOM_TYPE_ICON(selectedRoom.type)} size={18} color={ROOM_TYPE_COLOR(selectedRoom.type)}/>
              </View>
              <View style={{flex:1}}>
                <Text style={styles.roomBannerName}>{selectedRoom.name}</Text>
                <Text style={styles.roomBannerMeta}>
                  {selectedRoom.type}
                  {selectedRoom.building ? ` · ${selectedRoom.building}` : ""}
                  {selectedRoom.capacity>0 ? ` · Cap ${selectedRoom.capacity}` : ""}
                </Text>
              </View>
              <Text style={styles.roomBannerDay}>{activeDay}</Text>
            </View>

            {/* Time slots */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.timeSlotsContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#34d399"/>}>
              {TIME_SLOTS.map(ts=>{
                const key  = `${activeDay}_${ts.startTime}`;
                const slot = roomMap[selectedRoom.name]?.[key];
                const dc   = DAY_COLORS[activeDay];
                return (
                  <View key={key} style={styles.timeRow}>
                    <View style={styles.timeLabelWrap}>
                      <Text style={styles.timeLabel}>{ts.label}</Text>
                      <View style={styles.timeLine}/>
                    </View>
                    {slot ? (
                      <Pressable style={[styles.occupiedSlot,{borderLeftColor:dc}]}
                        onPress={()=>{ setSelSlot(slot); setDetailModal(true); }}>
                        <View style={styles.occupiedTop}>
                          <Text style={styles.occupiedSubject} numberOfLines={1}>{slot.subjectName}</Text>
                          <View style={[styles.semPill,{backgroundColor:dc+"18",borderColor:dc+"35"}]}>
                            <Text style={[styles.semPillText,{color:dc}]}>Sem {slot.semester}</Text>
                          </View>
                        </View>
                        <Text style={styles.occupiedTeacher} numberOfLines={1}>
                          👨‍🏫 {slot.teacherName}
                        </Text>
                        <View style={styles.occupiedMeta}>
                          <Text style={styles.occupiedMetaText}>
                            {slot.department?.split("(")[0].trim()} · Batch {slot.admissionYear}
                            {slot.section?" · Sec "+slot.section:""}
                          </Text>
                          <Ionicons name="chevron-forward" size={12} color="#374151"/>
                        </View>
                      </Pressable>
                    ) : (
                      <View style={styles.freeSlot}>
                        <Ionicons name="checkmark" size={12} color="#374151"/>
                        <Text style={styles.freeSlotText}>Available</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{height:40}}/>
            </ScrollView>
          </>
        )

        // ════════════════════════════════
        // VIEW: CONFLICTS
        // ════════════════════════════════
        : view==="conflicts" ? (
          <ScrollView contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#f87171"/>}>
            {conflicts.length===0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon,{backgroundColor:"rgba(52,211,153,0.1)"}]}>
                  <Ionicons name="checkmark-circle" size={40} color="#34d399"/>
                </View>
                <Text style={[styles.emptyTitle,{color:"#34d399"}]}>No Conflicts!</Text>
                <Text style={styles.emptySub}>All timetables are properly scheduled.</Text>
              </View>
            ) : (
              <>
                <View style={styles.conflictHeader}>
                  <Ionicons name="warning" size={14} color="#f87171"/>
                  <Text style={styles.conflictHeaderText}>
                    {conflicts.length} conflict{conflicts.length>1?"s":""} detected
                  </Text>
                </View>
                {conflicts.map((c,i)=>(
                  <View key={i} style={[styles.conflictCard, {
                    borderLeftColor: c.type.includes("Room")?"#f87171":c.type.includes("Teacher")?"#f59e0b":"#a78bfa"
                  }]}>
                    <Text style={[styles.conflictType, {
                      color: c.type.includes("Room")?"#f87171":c.type.includes("Teacher")?"#f59e0b":"#a78bfa"
                    }]}>{c.type}</Text>
                    <Text style={styles.conflictMsg}>{c.message}</Text>
                    <View style={styles.conflictMeta}>
                      <Ionicons name="calendar-outline" size={10} color="#64748b"/>
                      <Text style={styles.conflictMetaText}>{c.day} · {c.time}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        ) : null
      )}

      {/* ════ ADD/EDIT ROOM MODAL ════ */}
      <Modal visible={roomModal} transparent animationType="slide"
        onRequestClose={()=>!savingRoom&&setRoomModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <View style={styles.handle}/>
              <View style={styles.sheetHead}>
                <View style={[styles.sheetHeadIcon,{backgroundColor:"rgba(52,211,153,0.12)"}]}>
                  <Ionicons name="business" size={20} color="#34d399"/>
                </View>
                <View style={{flex:1}}>
                  <Text style={styles.sheetTitle}>{editingRoom?"Edit Room":"Add New Room"}</Text>
                  <Text style={styles.sheetSub}>{adminCollege.split(" ").slice(0,3).join(" ")}</Text>
                </View>
                <Pressable onPress={()=>setRoomModal(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={18} color="#64748b"/>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                contentContainerStyle={{paddingHorizontal:20,paddingBottom:50}}>

                {/* Room name */}
                <Text style={styles.fieldLabel}>Room Name *</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="business-outline" size={15} color="#64748b"/>
                  <TextInput style={styles.inputField}
                    placeholder="e.g. Room 101, Lab 3, LT-A"
                    placeholderTextColor="#374151"
                    value={roomForm.name}
                    onChangeText={v=>setRoomForm(p=>({...p,name:v}))}/>
                </View>

                {/* Room type */}
                <Text style={styles.fieldLabel}>Room Type *</Text>
                <View style={styles.typeGrid}>
                  {ROOM_TYPES.map(rt=>{
                    const sel = roomForm.type===rt.key;
                    return (
                      <Pressable key={rt.key}
                        style={[styles.typeBtn, sel&&{backgroundColor:rt.color+"18",borderColor:rt.color+"55"}]}
                        onPress={()=>setRoomForm(p=>({...p,type:rt.key}))}>
                        <View style={[styles.typeBtnIcon,{backgroundColor:sel?rt.color+"22":"rgba(255,255,255,0.05)"}]}>
                          <Ionicons name={rt.icon} size={18} color={sel?rt.color:"#64748b"}/>
                        </View>
                        <Text style={[styles.typeBtnLabel,sel&&{color:rt.color}]}>{rt.key}</Text>
                        {sel&&<View style={[styles.typeBtnCheck,{backgroundColor:rt.color}]}>
                          <Ionicons name="checkmark" size={9} color="#fff"/>
                        </View>}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Capacity */}
                <Text style={styles.fieldLabel}>Capacity (optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="people-outline" size={15} color="#64748b"/>
                  <TextInput style={styles.inputField}
                    placeholder="e.g. 60"
                    placeholderTextColor="#374151"
                    keyboardType="numeric"
                    value={roomForm.capacity}
                    onChangeText={v=>setRoomForm(p=>({...p,capacity:v}))}/>
                </View>

                {/* Building */}
                <Text style={styles.fieldLabel}>Building (optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="map-outline" size={15} color="#64748b"/>
                  <TextInput style={styles.inputField}
                    placeholder="e.g. Block A, Main Building"
                    placeholderTextColor="#374151"
                    value={roomForm.building}
                    onChangeText={v=>setRoomForm(p=>({...p,building:v}))}/>
                </View>

                {/* Floor */}
                <Text style={styles.fieldLabel}>Floor (optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="layers-outline" size={15} color="#64748b"/>
                  <TextInput style={styles.inputField}
                    placeholder="e.g. Ground, 1st Floor"
                    placeholderTextColor="#374151"
                    value={roomForm.floor}
                    onChangeText={v=>setRoomForm(p=>({...p,floor:v}))}/>
                </View>

                {/* College (auto, read-only) */}
                <View style={styles.collegeNote}>
                  <Ionicons name="lock-closed-outline" size={12} color="#34d399"/>
                  <Text style={styles.collegeNoteText}>
                    Auto-assigned to: <Text style={{color:"#34d399",fontWeight:"700"}}>{adminCollege}</Text>
                  </Text>
                </View>

                {/* Submit */}
                <Pressable style={[styles.submitBtn,savingRoom&&{opacity:0.6}]}
                  onPress={handleAddRoom} disabled={savingRoom}>
                  <LinearGradient colors={["#10b981","#059669"]}
                    start={{x:0,y:0}} end={{x:1,y:0}} style={styles.submitGrad}>
                    {savingRoom
                      ? <ActivityIndicator size="small" color="#fff"/>
                      : <><Ionicons name={editingRoom?"save-outline":"add-circle-outline"} size={18} color="#fff"/>
                          <Text style={styles.submitText}>{editingRoom?"Save Changes":"Add Room"}</Text></>
                    }
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════ SLOT DETAIL MODAL ════ */}
      <Modal visible={detailModal} transparent animationType="slide"
        onRequestClose={()=>setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={{flex:1}} onPress={()=>setDetailModal(false)}/>
          <View style={styles.detailSheet}>
            <View style={styles.handle}/>
            {selSlot&&(
              <>
                <View style={[styles.detailTop, {backgroundColor:DAY_COLORS[selSlot.day]+"12"}]}>
                  <View style={[styles.detailRoomBadge,{backgroundColor:DAY_COLORS[selSlot.day]+"20"}]}>
                    <Ionicons name="business" size={14} color={DAY_COLORS[selSlot.day]}/>
                    <Text style={[styles.detailRoomText,{color:DAY_COLORS[selSlot.day]}]}>
                      Room {selSlot.room}
                    </Text>
                  </View>
                  <Text style={styles.detailSubjectName}>{selSlot.subjectName}</Text>
                  <View style={styles.detailTimeRow}>
                    <Ionicons name="time-outline" size={12} color="#64748b"/>
                    <Text style={styles.detailTimeText}>
                      {selSlot.day} · {selSlot.startTime} — {selSlot.endTime}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRows}>
                  {[
                    {icon:"person-outline",   label:"Teacher",    value:selSlot.teacherName,  color:"#f59e0b"},
                    {icon:"school-outline",   label:"Department", value:selSlot.department?.split("(")[0].trim(),color:"#a78bfa"},
                    {icon:"layers-outline",   label:"Semester",   value:`Semester ${selSlot.semester}`, color:"#00c6ff"},
                    {icon:"calendar-outline", label:"Batch",      value:selSlot.admissionYear, color:"#34d399"},
                    {icon:"people-outline",   label:"Section",    value:selSlot.section||"All",color:"#fb923c"},
                  ].map((row,i)=>(
                    <View key={i} style={styles.detailRow}>
                      <View style={[styles.detailRowIcon,{backgroundColor:row.color+"18"}]}>
                        <Ionicons name={row.icon} size={14} color={row.color}/>
                      </View>
                      <View>
                        <Text style={styles.detailRowLabel}>{row.label}</Text>
                        <Text style={styles.detailRowValue}>{row.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.detailCloseBtn} onPress={()=>setDetailModal(false)}>
                  <Text style={styles.detailCloseBtnText}>Close</Text>
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
  container:         { flex:1, backgroundColor:"#080d17" },
  header:            { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14, gap:10 },
  backBtn:           { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:      { flex:1, alignItems:"center" },
  headerTitle:       { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:         { color:"#64748b", fontSize:10, marginTop:2 },
  addBtn:            { width:40, height:40, borderRadius:12, justifyContent:"center", alignItems:"center", borderWidth:1 },

  // View tabs
  viewTabs:          { flexDirection:"row", gap:10, marginHorizontal:16, marginTop:8, marginBottom:8 },
  viewTab:           { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:9, borderRadius:12, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  viewTabText:       { color:"#64748b", fontSize:12, fontWeight:"700" },

  // Search
  searchBox:         { flexDirection:"row", alignItems:"center", marginHorizontal:16, marginBottom:8, backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:12, paddingVertical:10, gap:8, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  searchInput:       { flex:1, color:"#fff", fontSize:13 },

  // Legend
  legendRow:         { paddingHorizontal:16, gap:8, paddingVertical:6, marginBottom:4 },
  legendItem:        { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:20, borderWidth:1, backgroundColor:"rgba(255,255,255,0.03)" },
  legendText:        { fontSize:10, fontWeight:"600" },

  // Room cards
  listContent:       { paddingHorizontal:16, paddingBottom:40 },
  roomCard:          { flexDirection:"row", alignItems:"center", backgroundColor:"#0f1b2d", borderRadius:15, padding:14, marginBottom:10, gap:12, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomCardLeft:      { width:48, height:48, borderRadius:13, justifyContent:"center", alignItems:"center", borderWidth:1 },
  roomCardBody:      { flex:1 },
  roomCardTop:       { flexDirection:"row", alignItems:"center", gap:8, marginBottom:6 },
  roomCardName:      { color:"#fff", fontSize:14, fontWeight:"800", flex:1 },
  roomTypeBadge:     { paddingHorizontal:8, paddingVertical:3, borderRadius:8, borderWidth:1 },
  roomTypeBadgeText: { fontSize:9, fontWeight:"800" },
  roomCardMeta:      { flexDirection:"row", flexWrap:"wrap", gap:10 },
  roomMetaItem:      { flexDirection:"row", alignItems:"center", gap:4 },
  roomMetaText:      { color:"#64748b", fontSize:10 },
  roomCardActions:   { flexDirection:"column", gap:6 },
  roomActionBtn:     { width:30, height:30, borderRadius:9, backgroundColor:"rgba(245,158,11,0.1)", justifyContent:"center", alignItems:"center" },

  // Day tabs
  dayTabsRow:        { paddingHorizontal:16, gap:8, alignItems:"center" },
  dayTab:            { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  dayTabText:        { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayDot:            { width:5, height:5, borderRadius:3 },

  // Room banner
  roomBanner:        { flexDirection:"row", alignItems:"center", gap:12, marginHorizontal:16, marginTop:10, marginBottom:6, backgroundColor:"rgba(255,255,255,0.04)", borderRadius:13, padding:12, borderWidth:1 },
  roomBannerIcon:    { width:40, height:40, borderRadius:11, justifyContent:"center", alignItems:"center" },
  roomBannerName:    { color:"#fff", fontSize:14, fontWeight:"800" },
  roomBannerMeta:    { color:"#64748b", fontSize:11, marginTop:2 },
  roomBannerDay:     { color:"#a78bfa", fontSize:12, fontWeight:"700" },

  // Time slots
  timeSlotsContent:  { paddingHorizontal:16 },
  timeRow:           { flexDirection:"row", alignItems:"flex-start", gap:10, marginBottom:8 },
  timeLabelWrap:     { width:60, paddingTop:10, alignItems:"center" },
  timeLabel:         { color:"#374151", fontSize:9, fontWeight:"700", textAlign:"center" },
  timeLine:          { width:1, flex:1, backgroundColor:"rgba(255,255,255,0.04)", marginTop:4 },
  occupiedSlot:      { flex:1, backgroundColor:"#0f1b2d", borderRadius:12, padding:12, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", borderLeftWidth:3 },
  occupiedTop:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:4 },
  occupiedSubject:   { color:"#fff", fontSize:13, fontWeight:"700", flex:1 },
  semPill:           { paddingHorizontal:7, paddingVertical:3, borderRadius:7, borderWidth:1 },
  semPillText:       { fontSize:9, fontWeight:"800" },
  occupiedTeacher:   { color:"#94a3b8", fontSize:11, marginBottom:4 },
  occupiedMeta:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  occupiedMetaText:  { color:"#374151", fontSize:10, flex:1 },
  freeSlot:          { flex:1, height:40, backgroundColor:"rgba(255,255,255,0.02)", borderRadius:12, justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.04)", flexDirection:"row", gap:6 },
  freeSlotText:      { color:"#1f2937", fontSize:11 },

  // Conflicts
  conflictHeader:    { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(248,113,113,0.1)", padding:12, borderRadius:12, marginBottom:12, borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  conflictHeaderText:{ color:"#f87171", fontSize:12, fontWeight:"600", flex:1 },
  conflictCard:      { backgroundColor:"#0f1b2d", borderRadius:13, padding:14, marginBottom:8, borderWidth:1, borderColor:"rgba(255,255,255,0.07)", borderLeftWidth:3 },
  conflictType:      { fontSize:12, fontWeight:"800", marginBottom:4 },
  conflictMsg:       { color:"#94a3b8", fontSize:12, lineHeight:18, marginBottom:6 },
  conflictMeta:      { flexDirection:"row", alignItems:"center", gap:5 },
  conflictMetaText:  { color:"#64748b", fontSize:10 },

  // Empty
  loaderWrap:        { flex:1, justifyContent:"center", alignItems:"center", gap:12 },
  loaderText:        { color:"#374151", fontSize:13 },
  empty:             { alignItems:"center", paddingTop:60, gap:12 },
  emptyIcon:         { width:72, height:72, borderRadius:36, backgroundColor:"rgba(255,255,255,0.04)", justifyContent:"center", alignItems:"center", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  emptyTitle:        { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:          { color:"#1f2937", fontSize:12 },
  emptyAddBtn:       { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:20, paddingVertical:11, borderRadius:12, backgroundColor:"rgba(52,211,153,0.08)", borderWidth:1, borderColor:"rgba(52,211,153,0.25)", marginTop:4 },
  emptyAddText:      { color:"#34d399", fontSize:13, fontWeight:"700" },

  // Modal
  modalOverlay:      { flex:1, backgroundColor:"rgba(0,0,0,0.82)", justifyContent:"flex-end" },
  sheet:             { backgroundColor:"#0a1220", borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:height*0.92, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  handle:            { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.1)", alignSelf:"center", marginTop:12, marginBottom:4 },
  sheetHead:         { flexDirection:"row", alignItems:"center", gap:12, paddingHorizontal:20, paddingVertical:16, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  sheetHeadIcon:     { width:44, height:44, borderRadius:13, justifyContent:"center", alignItems:"center" },
  sheetTitle:        { color:"#fff", fontSize:16, fontWeight:"800" },
  sheetSub:          { color:"#374151", fontSize:11, marginTop:1 },
  closeBtn:          { width:32, height:32, borderRadius:16, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  fieldLabel:        { color:"#94a3b8", fontSize:11, fontWeight:"700", letterSpacing:0.5, textTransform:"uppercase", marginBottom:8, marginTop:16 },
  inputWrap:         { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:"#0f1b2d", borderRadius:12, paddingHorizontal:14, paddingVertical:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", marginBottom:4 },
  inputField:        { flex:1, color:"#fff", fontSize:14 },

  // Type grid
  typeGrid:          { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:4 },
  typeBtn:           { width:(width-60)/3-4, borderRadius:12, padding:10, alignItems:"center", borderWidth:1.5, borderColor:"rgba(255,255,255,0.08)", backgroundColor:"rgba(255,255,255,0.03)", gap:5, position:"relative" },
  typeBtnIcon:       { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center" },
  typeBtnLabel:      { color:"#64748b", fontSize:11, fontWeight:"700" },
  typeBtnCheck:      { position:"absolute", top:6, right:6, width:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center" },

  // College note
  collegeNote:       { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(52,211,153,0.07)", padding:12, borderRadius:11, marginTop:8, borderWidth:1, borderColor:"rgba(52,211,153,0.2)" },
  collegeNoteText:   { flex:1, color:"#64748b", fontSize:11 },

  // Submit
  submitBtn:         { borderRadius:14, overflow:"hidden", marginTop:16 },
  submitGrad:        { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:15 },
  submitText:        { color:"#fff", fontSize:15, fontWeight:"800" },

  // Detail
  detailSheet:       { backgroundColor:"#0a1220", borderTopLeftRadius:26, borderTopRightRadius:26, maxHeight:height*0.75, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  detailTop:         { padding:20, alignItems:"center", gap:8, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.06)" },
  detailRoomBadge:   { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:14, paddingVertical:7, borderRadius:20 },
  detailRoomText:    { fontSize:13, fontWeight:"800" },
  detailSubjectName: { color:"#fff", fontSize:20, fontWeight:"900", textAlign:"center" },
  detailTimeRow:     { flexDirection:"row", alignItems:"center", gap:6 },
  detailTimeText:    { color:"#64748b", fontSize:12 },
  detailRows:        { padding:20, gap:12 },
  detailRow:         { flexDirection:"row", alignItems:"center", gap:12 },
  detailRowIcon:     { width:36, height:36, borderRadius:10, justifyContent:"center", alignItems:"center" },
  detailRowLabel:    { color:"#64748b", fontSize:10, fontWeight:"600" },
  detailRowValue:    { color:"#fff", fontSize:14, fontWeight:"700", marginTop:2 },
  detailCloseBtn:    { margin:16, marginTop:0, padding:14, backgroundColor:"rgba(255,255,255,0.05)", borderRadius:12, alignItems:"center" },
  detailCloseBtnText:{ color:"#64748b", fontSize:14, fontWeight:"700" },
});