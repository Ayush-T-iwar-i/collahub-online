import React, { useState, useCallback } from "react";
import {
  View, StyleSheet, Text, FlatList, Pressable,
  StatusBar, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, SafeAreaView, Dimensions,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const { height, width } = Dimensions.get("window");

const STATUS_COLORS = {
  pending:  { bg:"rgba(245,158,11,0.15)",  border:"#f59e0b", text:"#f59e0b" },
  accepted: { bg:"rgba(52,211,153,0.15)",  border:"#34d399", text:"#34d399" },
  rejected: { bg:"rgba(248,113,113,0.15)", border:"#f87171", text:"#f87171" },
};

const DAYS      = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };
const DAY_COLORS= { Monday:"#00c6ff", Tuesday:"#a78bfa", Wednesday:"#34d399", Thursday:"#f59e0b", Friday:"#f87171", Saturday:"#fb923c" };
const TIME_SLOTS = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push({
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
    label: `${h > 12 ? h-12 : h}:00 ${h >= 12 ? "PM" : "AM"}`,
  });
}


// ══════════════════════════════════════════════════════════
// NEW TIMETABLE MODAL — Step-by-step smart assignment
// Step 1: Select Subject Type (Theory / Lab / Both)
// Step 2: Select FREE time slot (teacher's free slots only)
// Step 3: Select FREE room (LT for Theory, Lab for Lab)
// ══════════════════════════════════════════════════════════
const DAYS_LIST = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT_MAP = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat" };

const TimetableModal = ({ visible, request, onClose, onSaved }) => {
  // ── Step: "type" | "slots" | "rooms" | "confirm" ──
  const [step,         setStep]         = useState("type");

  // Step 1 — Subject type
  const [subjectType,  setSubjectType]  = useState("Theory");

  // Step 2 — Slot selection
  const [activeDay,    setActiveDay]    = useState("Monday");
  const [selectedSlots,setSelectedSlots]= useState({});  // { "Mon_09:00": {day,startTime,endTime} }
  const [teacherBusy,  setTeacherBusy]  = useState({});  // { "day_time": subjectName }
  const [batchBusy,    setBatchBusy]    = useState({});  // { "day_time": subjectName }
  const [loadingData,  setLoadingData]  = useState(false);

  // Step 3 — Room selection
  const [allRooms,     setAllRooms]     = useState([]);   // all college rooms from DB
  const [bookedRooms,  setBookedRooms]  = useState({});   // { "day||time||room": subjectName }
  // For "Both" type — theory gets LT, lab gets Lab
  const [ltRoomPerSlot,  setLtRoomPerSlot]  = useState({}); // { slotKey: roomName }
  const [labRoomPerSlot, setLabRoomPerSlot] = useState({}); // { slotKey: roomName }
  // For single type
  const [roomPerSlot,    setRoomPerSlot]    = useState({}); // { slotKey: roomName }

  const [saving,       setSaving]       = useState(false);

  // ── Load data when modal opens ────────────────────────
  React.useEffect(() => {
    if (visible && request) {
      setStep("type");
      setSubjectType(request.subjectType || "Theory");
      setSelectedSlots({});
      setRoomPerSlot({});
      setLtRoomPerSlot({});
      setLabRoomPerSlot({});
      setActiveDay("Monday");
      loadAllData(request);
    }
  }, [visible, request]);

  const loadAllData = async (req) => {
    setLoadingData(true);
    try {
      // Load accepted requests to find conflicts
      const [conflictsRes, roomsRes] = await Promise.all([
        API.get("/subject-requests", { params: { status: "accepted" } }),
        req.college ? API.get("/rooms", { params: { college: req.college } }) : Promise.resolve({ data: { rooms: [] } }),
      ]);

      const allAccepted = conflictsRes.data?.requests || [];
      const rooms       = roomsRes.data?.rooms || [];
      setAllRooms(rooms);

      const tBusy = {}, bBusy = {}, rBooked = {};

      allAccepted.forEach(r => {
        if (r._id === req._id) return;
        (r.timetable || []).forEach(slot => {
          const key = `${slot.day}_${slot.startTime}`;

          // Teacher busy
          if (String(r.teacherId) === String(req.teacherId)) {
            tBusy[key] = r.subjectName;
          }

          // Same batch busy (same semester + year + section)
          const sameBatch =
            r.semester      === req.semester &&
            r.admissionYear === req.admissionYear &&
            (r.section === "All" || req.section === "All" || r.section === req.section);
          if (sameBatch) bBusy[key] = r.subjectName;

          // Room booked
          if (slot.room?.trim()) {
            rBooked[`${slot.day}||${slot.startTime}||${slot.room.trim().toLowerCase()}`] = r.subjectName;
          }
        });
      });

      setTeacherBusy(tBusy);
      setBatchBusy(bBusy);
      setBookedRooms(rBooked);

      // Pre-fill if editing existing timetable
      if (req.timetable?.length > 0) {
        const slots = {}, rooms_ = {};
        req.timetable.forEach(s => {
          const k = `${s.day}_${s.startTime}`;
          slots[k] = { day: s.day, startTime: s.startTime, endTime: s.endTime };
          rooms_[k] = s.room || "";
        });
        setSelectedSlots(slots);
        setRoomPerSlot(rooms_);
      }
    } catch(e) {
      console.log("loadAllData error:", e.message);
    } finally {
      setLoadingData(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────
  const isTeacherFree   = (day, st) => !teacherBusy[`${day}_${st}`];
  const isBatchFree     = (day, st) => !batchBusy[`${day}_${st}`];
  const isSlotSelected  = (day, st) => !!selectedSlots[`${day}_${st}`];

  const toggleSlot = (day, slot) => {
    const key = `${day}_${slot.startTime}`;
    const slotLabel = TIME_SLOTS.find(t=>t.startTime===slot.startTime)?.label || slot.startTime;

    // HARD BLOCK: Teacher busy — cannot select at all
    if (!isTeacherFree(day, slot.startTime)) {
      Alert.alert(
        "🚫 Teacher Busy",
        `${request.teacherName} already has "${teacherBusy[key]}" on ${day} at ${slotLabel}.

This time slot cannot be selected.`
      );
      return;
    }

    // HARD BLOCK: Same batch students already have a class — cannot select
    if (!isBatchFree(day, slot.startTime)) {
      Alert.alert(
        "🚫 Students Already Have a Class",
        `Sem ${request.semester} Batch ${request.admissionYear}${request.section&&request.section!=="All"?` Sec ${request.section}`:""} already have "${batchBusy[key]}" on ${day} at ${slotLabel}.

This time slot cannot be selected.`
      );
      return;
    }

    // FREE — toggle selection
    setSelectedSlots(prev => {
      const u = {...prev};
      if (u[key]) delete u[key];
      else u[key] = { day, startTime: slot.startTime, endTime: slot.endTime };
      return u;
    });
  };

  const isRoomBooked = (day, st, roomName) =>
    !!bookedRooms[`${day}||${st}||${roomName.trim().toLowerCase()}`];

  // Free rooms of a given type
  const getFreeRooms = (type) => {
    const filtered = allRooms.filter(r => {
      if (type === "Lab")    return r.type === "Lab";
      if (type === "Theory") return r.type !== "Lab"; // LT, Lecture, Seminar
      return true;
    });
    return filtered;
  };

  // Is a room free for ALL selected slots?
  const isRoomFreeForAll = (roomName) => {
    return Object.values(selectedSlots).every(s =>
      !isRoomBooked(s.day, s.startTime, roomName)
    );
  };

  const totalSlots = Object.keys(selectedSlots).length;

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    if (totalSlots === 0) { Alert.alert("Error", "Select at least one time slot."); return; }

    const timetable = Object.values(selectedSlots).map(s => {
      const key = `${s.day}_${s.startTime}`;
      let room = "";
      if (subjectType === "Both") {
        // For "Both" — save with theory room (lab room saved separately via type field)
        room = ltRoomPerSlot[key] || roomPerSlot[key] || "";
      } else {
        room = roomPerSlot[key] || "";
      }
      return {
        day: s.day, startTime: s.startTime, endTime: s.endTime, room,
      };
    });

    setSaving(true);
    try {
      await API.put(`/subject-requests/${request._id}/accept`, {
        timetable,
        subjectType,
      });
      onSaved?.();
      onClose();
      Alert.alert("✅ Assigned!", `"${request.subjectName}" assigned to ${request.teacherName}.`);
    } catch(e) {
      Alert.alert("Conflict", e.response?.data?.message || e.message || "Could not assign.");
    } finally { setSaving(false); }
  };

  if (!request) return null;

  // ── Step colors ────────────────────────────────────────
  const typeColor = subjectType === "Lab" ? "#34d399" : subjectType === "Both" ? "#a78bfa" : "#00c6ff";
  const typeIcon  = subjectType === "Lab" ? "flask-outline" : subjectType === "Both" ? "layers-outline" : "book-outline";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ST.overlay}>
        <View style={ST.sheet}>
          <View style={ST.handle}/>

          {/* ── Header ── */}
          <View style={ST.header}>
            {step !== "type" ? (
              <Pressable onPress={() => {
                if (step === "slots")   setStep("type");
                if (step === "rooms")   setStep("slots");
                if (step === "confirm") setStep("rooms");
              }} style={ST.backBtn}>
                <Ionicons name="arrow-back" size={18} color="#fff"/>
              </Pressable>
            ) : <View style={{width:36}}/>}

            <View style={{flex:1, alignItems:"center"}}>
              <Text style={ST.headerTitle}>
                {step==="type"    ? "Subject Type"
                : step==="slots"  ? "Select Free Slots"
                : step==="rooms"  ? "Assign Rooms"
                                  : "Review & Confirm"}
              </Text>
              <Text style={ST.headerSub} numberOfLines={1}>
                {request.subjectName} · {request.teacherName}
              </Text>
            </View>

            <Pressable onPress={onClose} style={ST.closeBtn}>
              <Ionicons name="close" size={18} color="#64748b"/>
            </Pressable>
          </View>

          {/* ── Step progress ── */}
          <View style={ST.stepBar}>
            {[
              {key:"type",    label:"Type"},
              {key:"slots",   label:"Time"},
              {key:"rooms",   label:"Room"},
              {key:"confirm", label:"Confirm"},
            ].map((s,i) => {
              const steps = ["type","slots","rooms","confirm"];
              const cur   = steps.indexOf(step);
              const mine  = steps.indexOf(s.key);
              const done  = mine < cur;
              const active= mine === cur;
              return (
                <React.Fragment key={s.key}>
                  <View style={[ST.stepDot,
                    done   && {backgroundColor: typeColor},
                    active && {backgroundColor: typeColor, transform:[{scale:1.15}]},
                    !done&&!active && {backgroundColor:"rgba(255,255,255,0.1)"},
                  ]}>
                    {done
                      ? <Ionicons name="checkmark" size={10} color="#000"/>
                      : <Text style={[ST.stepDotNum,active&&{color:"#000"}]}>{i+1}</Text>
                    }
                  </View>
                  {i < 3 && <View style={[ST.stepLine, done&&{backgroundColor:typeColor}]}/>}
                </React.Fragment>
              );
            })}
          </View>

          {/* ── Info chips ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={ST.infoChips}>
            <View style={ST.infoChip}><Ionicons name="layers-outline" size={11} color="#f59e0b"/><Text style={ST.infoChipText}>Sem {request.semester}</Text></View>
            <View style={ST.infoChip}><Ionicons name="calendar-outline" size={11} color="#34d399"/><Text style={ST.infoChipText}>Batch {request.admissionYear}</Text></View>
            {request.section && request.section !== "All" && <View style={ST.infoChip}><Ionicons name="people-outline" size={11} color="#00c6ff"/><Text style={ST.infoChipText}>Sec {request.section}</Text></View>}
            <View style={ST.infoChip}><Ionicons name="school-outline" size={11} color="#a78bfa"/><Text style={ST.infoChipText}>{request.department?.match(/\(([^)]+)\)/)?.[1]||request.department?.split(" ")[0]}</Text></View>
            {totalSlots > 0 && <View style={[ST.infoChip,{backgroundColor:"rgba(52,211,153,0.15)",borderColor:"#34d399"}]}><Ionicons name="checkmark-circle" size={11} color="#34d399"/><Text style={[ST.infoChipText,{color:"#34d399"}]}>{totalSlots} slot{totalSlots>1?"s":""}</Text></View>}
          </ScrollView>

          {loadingData ? (
            <View style={ST.loadingWrap}>
              <ActivityIndicator size="large" color={typeColor}/>
              <Text style={ST.loadingText}>Loading schedule data...</Text>
            </View>
          ) : (

          <ScrollView showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={ST.body}>

            {/* ════ STEP 1: TYPE ════ */}
            {step === "type" && (
              <View>
                <Text style={ST.stepTitle}>What type of subject is this?</Text>
                <Text style={ST.stepHint}>This determines which rooms will be suggested</Text>

                {[
                  { key:"Theory", icon:"book-outline",   color:"#00c6ff", title:"Theory",      desc:"Classroom lecture — assigns a Lecture Theater (LT)" },
                  { key:"Lab",    icon:"flask-outline",   color:"#34d399", title:"Lab",         desc:"Practical session — assigns a Lab room" },
                  { key:"Both",   icon:"layers-outline",  color:"#a78bfa", title:"Theory + Lab",desc:"Both lecture and practical — assigns LT + Lab room" },
                ].map(t => {
                  const sel = subjectType === t.key;
                  return (
                    <Pressable key={t.key}
                      style={[ST.typeCard, sel && {borderColor: t.color+"70", backgroundColor: t.color+"10"}]}
                      onPress={() => setSubjectType(t.key)}>
                      <View style={[ST.typeIconWrap, {backgroundColor: sel ? t.color+"22" : "rgba(255,255,255,0.05)"}]}>
                        <Ionicons name={t.icon} size={24} color={sel ? t.color : "#64748b"}/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={[ST.typeCardTitle, sel && {color: t.color}]}>{t.title}</Text>
                        <Text style={ST.typeCardDesc}>{t.desc}</Text>
                      </View>
                      <View style={[ST.typeRadio, sel && {backgroundColor: t.color, borderColor: t.color}]}>
                        {sel && <Ionicons name="checkmark" size={12} color="#000"/>}
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable style={[ST.nextBtn, {backgroundColor: typeColor}]}
                  onPress={() => setStep("slots")}>
                  <Text style={ST.nextBtnText}>Next — Select Free Time Slots</Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff"/>
                </Pressable>
              </View>
            )}

            {/* ════ STEP 2: FREE TIME SLOTS ════ */}
            {step === "slots" && (
              <View>
                <Text style={ST.stepTitle}>Select Free Time Slots</Text>
                <Text style={ST.stepHint}>
                  🟢 Both teacher + students free  · 🔴 Teacher busy  · 🟠 Students of this batch already have a class
                </Text>

                {/* Subject type badge + free slot count */}
                <View style={ST.slotsSummaryRow}>
                  <View style={[ST.typePill, {backgroundColor: typeColor+"15", borderColor: typeColor+"40"}]}>
                    <Ionicons name={typeIcon} size={13} color={typeColor}/>
                    <Text style={[ST.typePillText, {color: typeColor}]}>{subjectType}</Text>
                  </View>
                  <View style={ST.freeCountBadge}>
                    <Ionicons name="time-outline" size={11} color="#34d399"/>
                    <Text style={ST.freeCountText}>
                      {TIME_SLOTS.filter(s=>isTeacherFree(activeDay,s.startTime)&&isBatchFree(activeDay,s.startTime)).length} truly free slots on {DAY_SHORT_MAP[activeDay]}
                    </Text>
                  </View>
                </View>

                {/* Day tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{marginBottom:12}} contentContainerStyle={{gap:8}}>
                  {DAYS_LIST.map(day => {
                    const isActive = activeDay === day;
                    const dc = DAY_COLORS[day];
                    const selCount = Object.keys(selectedSlots).filter(k=>k.startsWith(day)).length;
                    const busyCount = TIME_SLOTS.filter(s=>!isTeacherFree(day,s.startTime)||!isBatchFree(day,s.startTime)).length;
                    return (
                      <Pressable key={day}
                        style={[ST.dayTab, isActive&&{backgroundColor:dc+"20",borderColor:dc+"55"}]}
                        onPress={()=>setActiveDay(day)}>
                        <Text style={[ST.dayTabText, isActive&&{color:dc}]}>{DAY_SHORT_MAP[day]}</Text>
                        {selCount > 0 && (
                          <View style={[ST.dayBadge, {backgroundColor: dc}]}>
                            <Text style={ST.dayBadgeNum}>{selCount}</Text>
                          </View>
                        )}
                        {selCount===0 && busyCount>0 && (
                          <View style={[ST.dayBadge, {backgroundColor:"#f87171"}]}>
                            <Text style={ST.dayBadgeNum}>{busyCount}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Active day label */}
                <View style={ST.activeDayRow}>
                  <View style={[ST.activeDayDot, {backgroundColor: DAY_COLORS[activeDay]}]}/>
                  <Text style={[ST.activeDayName, {color: DAY_COLORS[activeDay]}]}>{activeDay}</Text>
                </View>

                {/* Free/Busy legend */}
                <View style={ST.legend}>
                  {[
                    {color:"#34d399", label:"Teacher & students free"},
                    {color:"#f87171", label:"Teacher busy"},
                    {color:"#f59e0b", label:"Students busy (same batch)"},
                    {color:"#a78bfa", label:"Selected"},
                  ].map(l=>(
                    <View key={l.label} style={ST.legendItem}>
                      <View style={[ST.legendDot, {backgroundColor:l.color+"40", borderColor:l.color}]}/>
                      <Text style={ST.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Time slots grid */}
                <View style={ST.slotsGrid}>
                  {TIME_SLOTS.map(slot => {
                    const key       = `${activeDay}_${slot.startTime}`;
                    const tFree     = isTeacherFree(activeDay, slot.startTime);
                    const bFree     = isBatchFree(activeDay, slot.startTime);
                    const sel       = isSlotSelected(activeDay, slot.startTime);
                    const tBusyName = teacherBusy[key];
                    const bBusyName = batchBusy[key];
                    const dc        = DAY_COLORS[activeDay];

                    const bg     = !tFree ? "rgba(248,113,113,0.1)"
                                 : !bFree ? "rgba(245,158,11,0.1)"
                                 : sel    ? dc+"22"
                                          : "rgba(52,211,153,0.06)";
                    const border = !tFree ? "#f87171"
                                 : !bFree ? "#f59e0b"
                                 : sel    ? dc
                                          : "rgba(52,211,153,0.3)";
                    const icon   = !tFree ? "close-circle"
                                 : !bFree ? "warning"
                                 : sel    ? "checkmark-circle"
                                          : "time-outline";
                    const iconC  = !tFree ? "#f87171"
                                 : !bFree ? "#f59e0b"
                                 : sel    ? dc
                                          : "#34d399";
                    const canTap = tFree && bFree; // BOTH teacher AND batch must be free
                    return (
                      <Pressable key={key}
                        disabled={!canTap}
                        style={[ST.slotChip, {backgroundColor:bg, borderColor:border, opacity:canTap?1:0.5}]}
                        onPress={() => toggleSlot(activeDay, slot)}>
                        <Ionicons name={icon} size={13} color={iconC}/>
                        <Text style={[ST.slotText, sel&&{color:dc,fontWeight:"700"}, !tFree&&{color:"#f87171",fontSize:10}]}>
                          {slot.label}
                        </Text>
                        {!tFree && (
                          <Text style={ST.slotBusyLabel} numberOfLines={1}>
                            {String(tBusyName||"").substring(0,8)}…
                          </Text>
                        )}
                        {tFree && !bFree && (
                          <Text style={[ST.slotBusyLabel,{color:"#f59e0b"}]} numberOfLines={1}>
                            Stu:{String(bBusyName||"").substring(0,7)}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Selected summary */}
                {totalSlots > 0 && (
                  <View style={ST.selectedSummary}>
                    <Ionicons name="checkmark-circle" size={14} color="#34d399"/>
                    <Text style={ST.selectedSummaryText}>
                      {totalSlots} slot{totalSlots>1?"s":""} selected:{" "}
                      {DAYS_LIST.map(d=>{
                        const s=Object.keys(selectedSlots).filter(k=>k.startsWith(d));
                        if(!s.length) return null;
                        return `${DAY_SHORT_MAP[d]}(${s.length})`;
                      }).filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                )}

                <Pressable
                  style={[ST.nextBtn, {backgroundColor:typeColor}, totalSlots===0&&{opacity:0.4}]}
                  disabled={totalSlots===0}
                  onPress={() => setStep("rooms")}>
                  <Text style={ST.nextBtnText}>Next — Assign Rooms</Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff"/>
                </Pressable>
              </View>
            )}

            {/* ════ STEP 3: ROOMS ════ */}
            {step === "rooms" && (
              <View>
                <Text style={ST.stepTitle}>Assign Rooms</Text>
                <Text style={ST.stepHint}>
                  {subjectType==="Both"
                    ? "Select a Lecture Theater (LT) for Theory and a Lab for practical sessions"
                    : subjectType==="Lab"
                    ? "Select a Lab room for this practical subject"
                    : "Select a Lecture Theater (LT) for this subject"}
                </Text>

                {/* For "Both" — two sections */}
                {subjectType === "Both" ? (
                  <>
                    {/* Theory — LT section */}
                    <View style={[ST.roomTypeSection, {borderColor:"rgba(0,198,255,0.25)"}]}>
                      <View style={ST.roomTypeSectionHeader}>
                        <View style={[ST.roomTypeSectionIcon, {backgroundColor:"rgba(0,198,255,0.12)"}]}>
                          <Ionicons name="book-outline" size={16} color="#00c6ff"/>
                        </View>
                        <View style={{flex:1}}>
                          <Text style={[ST.roomTypeSectionTitle, {color:"#00c6ff"}]}>Theory — Lecture Theater</Text>
                          <Text style={ST.roomTypeSectionSub}>Select a free LT for all {totalSlots} slot{totalSlots>1?"s":""}</Text>
                        </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{gap:8}}>
                        {getFreeRooms("Theory").map(r => {
                          const free    = isRoomFreeForAll(r.name);
                          const selKey  = Object.keys(ltRoomPerSlot)[0];
                          const isSelAll= Object.values(ltRoomPerSlot).length===totalSlots && Object.values(ltRoomPerSlot)[0]===r.name;
                          const rc      = "#00c6ff";
                          return (
                            <Pressable key={r._id}
                              disabled={!free}
                              style={[ST.roomChip,
                                !free && {backgroundColor:"rgba(248,113,113,0.1)", borderColor:"#f87171"},
                                free && isSelAll && {backgroundColor:rc+"20",borderColor:rc+"55"},
                                free && !isSelAll && {backgroundColor:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.1)"},
                              ]}
                              onPress={() => {
                                const u={};
                                Object.keys(selectedSlots).forEach(k=>{ u[k]=r.name; });
                                setLtRoomPerSlot(u);
                              }}>
                              <Ionicons name={free?"school-outline":"close-circle"} size={11} color={free?(isSelAll?rc:"#64748b"):"#f87171"}/>
                              <Text style={[ST.roomChipText, {color:free?(isSelAll?rc:"#94a3b8"):"#f87171"}]}>{r.name}</Text>
                              {r.capacity>0&&free&&<Text style={[ST.roomChipCap,{color:isSelAll?rc+"99":"#374151"}]}>·{r.capacity}</Text>}
                              {!free&&<Text style={ST.roomChipBooked}>Booked</Text>}
                            </Pressable>
                          );
                        })}
                        {getFreeRooms("Theory").length===0&&(
                          <Text style={ST.noRoomText}>No LT rooms added yet. Add rooms in Room Timetable screen.</Text>
                        )}
                      </ScrollView>
                    </View>

                    {/* Lab section */}
                    <View style={[ST.roomTypeSection, {borderColor:"rgba(52,211,153,0.25)", marginTop:12}]}>
                      <View style={ST.roomTypeSectionHeader}>
                        <View style={[ST.roomTypeSectionIcon, {backgroundColor:"rgba(52,211,153,0.12)"}]}>
                          <Ionicons name="flask-outline" size={16} color="#34d399"/>
                        </View>
                        <View style={{flex:1}}>
                          <Text style={[ST.roomTypeSectionTitle, {color:"#34d399"}]}>Lab — Lab Room</Text>
                          <Text style={ST.roomTypeSectionSub}>Select a free Lab for all {totalSlots} slot{totalSlots>1?"s":""}</Text>
                        </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{gap:8}}>
                        {getFreeRooms("Lab").map(r => {
                          const free   = isRoomFreeForAll(r.name);
                          const isSelAll= Object.values(labRoomPerSlot).length===totalSlots && Object.values(labRoomPerSlot)[0]===r.name;
                          const rc     = "#34d399";
                          return (
                            <Pressable key={r._id}
                              disabled={!free}
                              style={[ST.roomChip,
                                !free && {backgroundColor:"rgba(248,113,113,0.1)", borderColor:"#f87171"},
                                free && isSelAll && {backgroundColor:rc+"20",borderColor:rc+"55"},
                                free && !isSelAll && {backgroundColor:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.1)"},
                              ]}
                              onPress={() => {
                                const u={};
                                Object.keys(selectedSlots).forEach(k=>{ u[k]=r.name; });
                                setLabRoomPerSlot(u);
                              }}>
                              <Ionicons name={free?"flask-outline":"close-circle"} size={11} color={free?(isSelAll?rc:"#64748b"):"#f87171"}/>
                              <Text style={[ST.roomChipText, {color:free?(isSelAll?rc:"#94a3b8"):"#f87171"}]}>{r.name}</Text>
                              {r.capacity>0&&free&&<Text style={[ST.roomChipCap,{color:isSelAll?rc+"99":"#374151"}]}>·{r.capacity}</Text>}
                              {!free&&<Text style={ST.roomChipBooked}>Booked</Text>}
                            </Pressable>
                          );
                        })}
                        {getFreeRooms("Lab").length===0&&(
                          <Text style={ST.noRoomText}>No Lab rooms added. Add rooms in Room Timetable screen.</Text>
                        )}
                      </ScrollView>
                    </View>
                  </>
                ) : (
                  // Single type — Theory or Lab
                  <View style={[ST.roomTypeSection, {borderColor: typeColor+"30"}]}>
                    <View style={ST.roomTypeSectionHeader}>
                      <View style={[ST.roomTypeSectionIcon, {backgroundColor: typeColor+"15"}]}>
                        <Ionicons name={typeIcon} size={16} color={typeColor}/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={[ST.roomTypeSectionTitle, {color:typeColor}]}>
                          {subjectType==="Lab" ? "Lab Room" : "Lecture Theater (LT)"}
                        </Text>
                        <Text style={ST.roomTypeSectionSub}>
                          Select a free room for all {totalSlots} slot{totalSlots>1?"s":""}
                        </Text>
                      </View>
                    </View>

                    {/* Per-slot room assignment */}
                    {Object.entries(selectedSlots)
                      .sort(([,a],[,b])=>a.day.localeCompare(b.day)||a.startTime.localeCompare(b.startTime))
                      .map(([key, slot]) => {
                        const slotRooms = getFreeRooms(subjectType);
                        const dayColor  = DAY_COLORS[slot.day] || typeColor;
                        return (
                          <View key={key} style={ST.slotRoomRow}>
                            <View style={[ST.slotRoomTimeTag,{backgroundColor:dayColor+"18"}]}>
                              <Text style={[ST.slotRoomTimeText,{color:dayColor}]}>
                                {DAY_SHORT_MAP[slot.day]} {TIME_SLOTS.find(t=>t.startTime===slot.startTime)?.label}
                              </Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{gap:6}}>
                              {slotRooms.map(r=>{
                                const booked = isRoomBooked(slot.day, slot.startTime, r.name);
                                const selR   = roomPerSlot[key]===r.name;
                                const rc     = booked?"#f87171":typeColor;
                                return (
                                  <Pressable key={r._id}
                                    disabled={booked}
                                    style={[ST.roomChip,
                                      booked&&{backgroundColor:"rgba(248,113,113,0.1)",borderColor:"#f87171"},
                                      !booked&&selR&&{backgroundColor:typeColor+"20",borderColor:typeColor+"55"},
                                      !booked&&!selR&&{backgroundColor:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.1)"},
                                    ]}
                                    onPress={()=>{
                                      setRoomPerSlot(prev=>({...prev,[key]:r.name}));
                                    }}>
                                    <Ionicons name={booked?"close-circle":typeIcon} size={11} color={rc+(selR?"":"99")}/>
                                    <Text style={[ST.roomChipText,{color:booked?"#f87171":selR?typeColor:"#94a3b8"}]}>{r.name}</Text>
                                    {r.capacity>0&&!booked&&<Text style={ST.roomChipCap}>·{r.capacity}</Text>}
                                    {booked&&<Text style={ST.roomChipBooked}>Booked</Text>}
                                  </Pressable>
                                );
                              })}
                              {slotRooms.length===0&&(
                                <Text style={ST.noRoomText}>No rooms added yet</Text>
                              )}
                            </ScrollView>
                          </View>
                        );
                      })
                    }
                  </View>
                )}

                <Text style={ST.skipNote}>Room assignment is optional. You can skip and assign later.</Text>

                <Pressable style={[ST.nextBtn, {backgroundColor:typeColor}]}
                  onPress={()=>setStep("confirm")}>
                  <Text style={ST.nextBtnText}>Next — Review & Confirm</Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff"/>
                </Pressable>
              </View>
            )}

            {/* ════ STEP 4: CONFIRM ════ */}
            {step === "confirm" && (
              <View>
                <Text style={ST.stepTitle}>Review & Confirm</Text>
                <Text style={ST.stepHint}>Check everything before assigning</Text>

                {/* Subject type */}
                <View style={[ST.reviewCard, {borderColor:typeColor+"30"}]}>
                  <View style={[ST.reviewCardIcon, {backgroundColor:typeColor+"15"}]}>
                    <Ionicons name={typeIcon} size={18} color={typeColor}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={ST.reviewCardLabel}>Subject Type</Text>
                    <Text style={[ST.reviewCardValue, {color:typeColor}]}>{subjectType}</Text>
                  </View>
                </View>

                {/* Teacher */}
                <View style={ST.reviewCard}>
                  <View style={[ST.reviewCardIcon,{backgroundColor:"rgba(245,158,11,0.12)"}]}>
                    <Ionicons name="person-outline" size={18} color="#f59e0b"/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={ST.reviewCardLabel}>Teacher</Text>
                    <Text style={ST.reviewCardValue}>{request.teacherName}</Text>
                  </View>
                </View>

                {/* Schedule */}
                <View style={ST.reviewSchedule}>
                  <Text style={ST.reviewScheduleTitle}>
                    Schedule — {totalSlots} slot{totalSlots>1?"s":""}
                  </Text>
                  {DAYS_LIST.map(day=>{
                    const daySlots = Object.entries(selectedSlots).filter(([k])=>k.startsWith(day));
                    if(!daySlots.length) return null;
                    const dc = DAY_COLORS[day];
                    return (
                      <View key={day} style={ST.reviewDayRow}>
                        <View style={[ST.reviewDayTag,{backgroundColor:dc+"18"}]}>
                          <Text style={[ST.reviewDayText,{color:dc}]}>{DAY_SHORT_MAP[day]}</Text>
                        </View>
                        <View style={{flex:1,gap:4}}>
                          {daySlots.map(([key,s])=>{
                            const slotLabel = TIME_SLOTS.find(t=>t.startTime===s.startTime)?.label;
                            const r1 = subjectType==="Both" ? ltRoomPerSlot[key] : roomPerSlot[key];
                            const r2 = subjectType==="Both" ? labRoomPerSlot[key] : null;
                            return (
                              <View key={key} style={ST.reviewSlotRow}>
                                <Ionicons name="time-outline" size={11} color={dc}/>
                                <Text style={[ST.reviewSlotTime,{color:dc}]}>{slotLabel}</Text>
                                {r1 && <View style={[ST.reviewRoomBadge,{backgroundColor:dc+"15"}]}>
                                  <Ionicons name={subjectType==="Lab"?"flask-outline":"school-outline"} size={10} color={dc}/>
                                  <Text style={[ST.reviewRoomText,{color:dc}]}>{r1}</Text>
                                </View>}
                                {r2 && <View style={[ST.reviewRoomBadge,{backgroundColor:"rgba(52,211,153,0.15)"}]}>
                                  <Ionicons name="flask-outline" size={10} color="#34d399"/>
                                  <Text style={[ST.reviewRoomText,{color:"#34d399"}]}>{r2}</Text>
                                </View>}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Submit */}
                <Pressable
                  style={[ST.saveBtn, saving&&{opacity:0.5}]}
                  onPress={handleSave}
                  disabled={saving}>
                  <LinearGradient colors={["#10b981","#059669"]}
                    start={{x:0,y:0}} end={{x:1,y:0}} style={ST.saveBtnInner}>
                    {saving
                      ? <ActivityIndicator color="#fff"/>
                      : <><Ionicons name="checkmark-circle" size={18} color="#fff"/>
                          <Text style={ST.saveBtnText}>Accept & Assign to Teacher</Text></>
                    }
                  </LinearGradient>
                </Pressable>
              </View>
            )}

          </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Modal Styles ───────────────────────────────────────────
const ST = StyleSheet.create({
  overlay:          { flex:1, backgroundColor:"rgba(0,0,0,0.85)", justifyContent:"flex-end" },
  sheet:            { backgroundColor:"#0a1220", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:"93%", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  handle:           { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:2 },
  header:           { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12 },
  backBtn:          { width:36, height:36, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  closeBtn:         { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  headerTitle:      { color:"#fff", fontSize:16, fontWeight:"800" },
  headerSub:        { color:"#64748b", fontSize:11, marginTop:2 },
  stepBar:          { flexDirection:"row", alignItems:"center", paddingHorizontal:24, marginBottom:8 },
  stepDot:          { width:24, height:24, borderRadius:12, justifyContent:"center", alignItems:"center" },
  stepDotNum:       { color:"#64748b", fontSize:10, fontWeight:"700" },
  stepLine:         { flex:1, height:2, backgroundColor:"rgba(255,255,255,0.08)", marginHorizontal:4 },
  infoChips:        { paddingHorizontal:16, paddingBottom:8, gap:7 },
  infoChip:         { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  infoChipText:     { color:"#94a3b8", fontSize:11, fontWeight:"600" },
  loadingWrap:      { alignItems:"center", paddingVertical:60, gap:12 },
  loadingText:      { color:"#64748b", fontSize:13 },
  body:             { padding:16, paddingBottom:30 },
  stepTitle:        { color:"#fff", fontSize:16, fontWeight:"800", marginBottom:4 },
  stepHint:         { color:"#64748b", fontSize:12, marginBottom:16, lineHeight:18 },
  // Type cards
  typeCard:         { flexDirection:"row", alignItems:"center", backgroundColor:"rgba(255,255,255,0.04)", borderRadius:16, padding:14, marginBottom:10, borderWidth:1.5, borderColor:"rgba(255,255,255,0.08)", gap:14 },
  typeIconWrap:     { width:50, height:50, borderRadius:14, justifyContent:"center", alignItems:"center" },
  typeCardTitle:    { color:"#fff", fontSize:15, fontWeight:"800", marginBottom:3 },
  typeCardDesc:     { color:"#64748b", fontSize:12, lineHeight:17 },
  typeRadio:        { width:22, height:22, borderRadius:11, borderWidth:2, borderColor:"#374151", justifyContent:"center", alignItems:"center" },
  typePill:         { flexDirection:"row", alignItems:"center", gap:7, paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1, alignSelf:"flex-start", marginBottom:12 },
  typePillText:     { fontSize:12, fontWeight:"700" },
  // Day tabs
  dayTab:           { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:14, paddingVertical:7, borderRadius:20, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  dayTabText:       { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayBadge:         { width:16, height:16, borderRadius:8, justifyContent:"center", alignItems:"center" },
  dayBadgeNum:      { color:"#000", fontSize:9, fontWeight:"800" },
  activeDayRow:     { flexDirection:"row", alignItems:"center", gap:8, marginBottom:10 },
  activeDayDot:     { width:8, height:8, borderRadius:4 },
  activeDayName:    { fontSize:14, fontWeight:"800" },
  legend:           { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:12 },
  legendItem:       { flexDirection:"row", alignItems:"center", gap:5 },
  legendDot:        { width:10, height:10, borderRadius:5, borderWidth:1.5 },
  legendText:       { color:"#64748b", fontSize:10 },
  // Slots grid
  slotsGrid:        { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:14 },
  slotChip:         { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:9, borderRadius:10, borderWidth:1 },
  slotText:         { color:"#64748b", fontSize:11 },
  slotBusyLabel:    { color:"#f87171", fontSize:8, fontWeight:"700", maxWidth:44 },
  selectedSummary:  { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(52,211,153,0.08)", padding:10, borderRadius:10, marginBottom:14, borderWidth:1, borderColor:"rgba(52,211,153,0.2)" },
  selectedSummaryText:{ color:"#34d399", fontSize:12, flex:1 },
  // Rooms
  roomTypeSection:  { backgroundColor:"rgba(255,255,255,0.03)", borderRadius:14, padding:14, borderWidth:1 },
  roomTypeSectionHeader:{ flexDirection:"row", alignItems:"center", gap:10, marginBottom:12 },
  roomTypeSectionIcon:  { width:38, height:38, borderRadius:11, justifyContent:"center", alignItems:"center" },
  roomTypeSectionTitle: { fontSize:14, fontWeight:"800" },
  roomTypeSectionSub:   { color:"#64748b", fontSize:11, marginTop:2 },
  roomChip:         { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:8, borderRadius:20, borderWidth:1 },
  roomChipText:     { fontSize:11, fontWeight:"700" },
  roomChipCap:      { fontSize:9, color:"#374151" },
  roomChipBooked:   { fontSize:9, fontWeight:"800", color:"#f87171" },
  noRoomText:       { color:"#374151", fontSize:11, fontStyle:"italic", paddingVertical:6 },
  skipNote:         { color:"#374151", fontSize:10, textAlign:"center", marginTop:10, marginBottom:4 },
  slotRoomRow:      { marginBottom:12 },
  slotRoomTimeTag:  { paddingHorizontal:10, paddingVertical:5, borderRadius:8, alignSelf:"flex-start", marginBottom:7 },
  slotRoomTimeText: { fontSize:11, fontWeight:"700" },
  // Review
  reviewCard:       { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:"rgba(255,255,255,0.04)", borderRadius:12, padding:12, marginBottom:8, borderWidth:1, borderColor:"rgba(255,255,255,0.07)" },
  reviewCardIcon:   { width:40, height:40, borderRadius:11, justifyContent:"center", alignItems:"center" },
  reviewCardLabel:  { color:"#64748b", fontSize:10, fontWeight:"600" },
  reviewCardValue:  { color:"#fff", fontSize:14, fontWeight:"700", marginTop:2 },
  reviewSchedule:   { backgroundColor:"rgba(167,139,250,0.07)", borderRadius:14, padding:14, marginBottom:14, borderWidth:1, borderColor:"rgba(167,139,250,0.2)" },
  reviewScheduleTitle:{ color:"#a78bfa", fontSize:12, fontWeight:"700", marginBottom:10 },
  reviewDayRow:     { flexDirection:"row", alignItems:"flex-start", gap:10, marginBottom:8 },
  reviewDayTag:     { paddingHorizontal:10, paddingVertical:5, borderRadius:8, minWidth:40, alignItems:"center" },
  reviewDayText:    { fontSize:11, fontWeight:"800" },
  reviewSlotRow:    { flexDirection:"row", alignItems:"center", gap:7, flexWrap:"wrap" },
  reviewSlotTime:   { fontSize:12, fontWeight:"700" },
  reviewRoomBadge:  { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:8, paddingVertical:3, borderRadius:7 },
  reviewRoomText:   { fontSize:10, fontWeight:"700" },
  // Buttons
  nextBtn:          { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:15, borderRadius:14, marginTop:16 },
  nextBtnText:      { color:"#fff", fontWeight:"800", fontSize:15 },
  saveBtn:          { borderRadius:14, overflow:"hidden", marginTop:4 },
  saveBtnInner:     { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  saveBtnText:      { color:"#fff", fontWeight:"800", fontSize:15 },
  // Slot step additions
  slotsSummaryRow:  { flexDirection:"row", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" },
  freeCountBadge:   { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(52,211,153,0.08)", paddingHorizontal:10, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(52,211,153,0.2)" },
  freeCountText:    { color:"#34d399", fontSize:11, fontWeight:"700" },
});


export default function AdminSubjectRequests() {
  const router = useRouter();
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState("pending");
  const [acting,     setActing]     = useState(false);
  const [rejectModal,setRejectModal]= useState(false);
  const [selReq,     setSelReq]     = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [ttModal,    setTtModal]    = useState(false);
  const [ttReq,      setTtReq]      = useState(null);

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const loadRequests = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await API.get("/subject-requests");
      setRequests(res.data?.requests || []);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not load requests.");
    } finally { setLoading(false); setRefreshing(false); }
  };

  const handleReject = async () => {
    if (!selReq) return;
    try {
      setActing(true);
      await API.put(`/subject-requests/${selReq._id}/reject`, { note: rejectNote });
      setRejectModal(false); setRejectNote("");
      await loadRequests();
      Alert.alert("Done", "Request has been rejected.");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not reject request.");
    } finally { setActing(false); }
  };

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const counts = {
    pending:  requests.filter(r => r.status === "pending").length,
    accepted: requests.filter(r => r.status === "accepted").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    all:      requests.length,
  };
  const FILTERS = [
    { key:"pending",  label:"Pending",  color:"#f59e0b" },
    { key:"accepted", label:"Accepted", color:"#34d399" },
    { key:"rejected", label:"Rejected", color:"#f87171" },
    { key:"all",      label:"All",      color:"#00c6ff" },
  ];

  const renderRequest = ({ item }) => {
    const sc           = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const hasTimetable = item.timetable?.length > 0;
    const date         = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";
    return (
      <View style={[styles.card, item.status==="accepted" && styles.cardAccepted]}>
        <View style={[styles.cardStripe,{backgroundColor:sc.border}]}/>
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={{flex:1,paddingRight:8}}>
              <Text style={styles.cardSubName} numberOfLines={1}>{item.subjectName}</Text>
              {item.subjectCode && <View style={styles.codeBadge}><Text style={styles.codeText}>{item.subjectCode}</Text></View>}
            </View>
            <View style={[styles.statusBadge,{backgroundColor:sc.bg,borderColor:sc.border}]}>
              <View style={[styles.statusDot,{backgroundColor:sc.border}]}/>
              <Text style={[styles.statusText,{color:sc.text}]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.teacherRow}>
            <View style={styles.teacherAvatar}>
              <Text style={styles.teacherAvatarText}>{item.teacherName?.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()||"T"}</Text>
            </View>
            <View style={{flex:1}}>
              <Text style={styles.teacherName} numberOfLines={1}>{item.teacherName}</Text>
              <Text style={styles.dateText}>{date}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="school-outline" size={10} color="#a78bfa"/><Text style={[styles.metaChipText,{color:"#a78bfa"}]}>{item.department?.match(/\(([^)]+)\)/)?.[1]||item.department?.split(" ")[0]}</Text></View>
            <View style={styles.metaChip}><Ionicons name="layers-outline" size={10} color="#00c6ff"/><Text style={[styles.metaChipText,{color:"#00c6ff"}]}>Sem {item.semester}</Text></View>
            <View style={styles.metaChip}><Ionicons name="calendar-outline" size={10} color="#f59e0b"/><Text style={[styles.metaChipText,{color:"#f59e0b"}]}>Batch {item.admissionYear}</Text></View>
            {item.section && item.section!=="All" && <View style={styles.metaChip}><Ionicons name="people-outline" size={10} color="#34d399"/><Text style={[styles.metaChipText,{color:"#34d399"}]}>Sec {item.section}</Text></View>}
          </View>

          {hasTimetable && (
            <View style={styles.ttPreview}>
              <Ionicons name="calendar-outline" size={11} color="#34d399"/>
              <Text style={styles.ttPreviewText} numberOfLines={2}>
                {item.timetable.map(s=>`${DAY_SHORT[s.day]||s.day} ${s.startTime}${s.room?` (${s.room})`:""}`).join("  ·  ")}
              </Text>
            </View>
          )}

          {!!item.adminNote && (
            <View style={styles.adminNoteBox}>
              <Ionicons name="chatbox-outline" size={11} color={sc.text}/>
              <Text style={[styles.adminNoteText,{color:sc.text}]}>{item.adminNote}</Text>
            </View>
          )}

          {item.status === "pending" && (
            <View style={styles.actionRow}>
              <Pressable style={styles.acceptBtn} onPress={()=>{setTtReq(item);setTtModal(true);}}>
                <Ionicons name="calendar-outline" size={14} color="#34d399"/>
                <Text style={styles.acceptBtnText}>Accept & Set Timetable</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={()=>{setSelReq(item);setRejectModal(true);}}>
                <Ionicons name="close-circle-outline" size={14} color="#f87171"/>
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
            </View>
          )}
          {item.status === "accepted" && (
            <Pressable style={styles.editTtBtn} onPress={()=>{setTtReq(item);setTtModal(true);}}>
              <Ionicons name="pencil-outline" size={12} color="#a78bfa"/>
              <Text style={styles.editTtBtnText}>Edit Timetable</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080d17"/>

      <LinearGradient colors={["#080d17","#0f1923"]} style={styles.header}>
        <Pressable onPress={()=>router.canGoBack()?router.back():router.replace("/admin/dashboard")} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff"/>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Subject Requests</Text>
          {counts.pending > 0 && <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>{counts.pending} pending</Text></View>}
        </View>
        <View style={{width:40}}/>
      </LinearGradient>

      <View style={styles.statsStrip}>
        {FILTERS.map(f=>(
          <Pressable key={f.key}
            style={[styles.statPill, filter===f.key&&{backgroundColor:f.color+"18",borderColor:f.color+"55"}]}
            onPress={()=>setFilter(f.key)}>
            <Text style={[styles.statPillCount, filter===f.key&&{color:f.color}]}>{counts[f.key]}</Text>
            <Text style={[styles.statPillLabel, filter===f.key&&{color:f.color}]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#00c6ff"/></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i=>i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>loadRequests(true)} tintColor="#00c6ff"/>}
          ListEmptyComponent={()=>(
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="clipboard-outline" size={44} color="#374151"/></View>
              <Text style={styles.emptyTitle}>No {filter} requests</Text>
              <Text style={styles.emptySub}>{filter==="pending"?"All requests have been reviewed.":`No ${filter} requests found.`}</Text>
            </View>
          )}
          renderItem={renderRequest}
        />
      )}

      <TimetableModal visible={ttModal} request={ttReq} onClose={()=>setTtModal(false)} onSaved={loadRequests}/>

      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={()=>setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectSheet}>
            <View style={styles.handle}/>
            <View style={styles.rejectHeaderRow}>
              <View style={styles.rejectIconWrap}><Ionicons name="close-circle" size={20} color="#f87171"/></View>
              <View style={{flex:1}}>
                <Text style={styles.rejectTitle}>Reject Request</Text>
                <Text style={styles.rejectSub} numberOfLines={1}>{selReq?.subjectName} — {selReq?.teacherName}</Text>
              </View>
              <Pressable onPress={()=>setRejectModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b"/>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Rejection Reason (optional)</Text>
            <TextInput style={styles.noteInput} placeholder="Explain why this request is being rejected..."
              placeholderTextColor="#374151" value={rejectNote} onChangeText={setRejectNote}
              multiline numberOfLines={4} textAlignVertical="top"/>
            <View style={styles.modalBtnRow}>
              <Pressable style={styles.cancelModalBtn} onPress={()=>{setRejectModal(false);setRejectNote("");}}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.rejectModalBtn,acting&&{opacity:0.7}]} onPress={handleReject} disabled={acting}>
                {acting
                  ? <ActivityIndicator color="#fff" size="small"/>
                  : <><Ionicons name="close-circle-outline" size={16} color="#fff"/><Text style={styles.rejectModalText}>Reject Request</Text></>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex:1, backgroundColor:"#080d17" },
  center:              { flex:1, justifyContent:"center", alignItems:"center" },
  header:              { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:18, paddingBottom:14 },
  backBtn:             { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:        { flex:1, alignItems:"center", gap:6 },
  headerTitle:         { color:"#fff", fontSize:18, fontWeight:"800" },
  pendingBadge:        { backgroundColor:"rgba(245,158,11,0.15)", paddingHorizontal:10, paddingVertical:3, borderRadius:20, borderWidth:1, borderColor:"rgba(245,158,11,0.3)" },
  pendingBadgeText:    { color:"#f59e0b", fontSize:10, fontWeight:"700" },
  statsStrip:          { flexDirection:"row", paddingHorizontal:16, paddingVertical:10, gap:8, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)" },
  statPill:            { flex:1, alignItems:"center", paddingVertical:8, borderRadius:12, backgroundColor:"rgba(255,255,255,0.04)", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  statPillCount:       { color:"#64748b", fontSize:18, fontWeight:"800" },
  statPillLabel:       { color:"#374151", fontSize:9, fontWeight:"700", marginTop:1 },
  list:                { padding:16, paddingBottom:40 },
  card:                { flexDirection:"row", backgroundColor:"#1a2535", borderRadius:16, marginBottom:12, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  cardAccepted:        { borderColor:"rgba(52,211,153,0.2)" },
  cardStripe:          { width:4, alignSelf:"stretch" },
  cardBody:            { flex:1, padding:14 },
  cardTopRow:          { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 },
  cardSubName:         { color:"#fff", fontSize:15, fontWeight:"800" },
  codeBadge:           { backgroundColor:"rgba(0,198,255,0.12)", paddingHorizontal:8, paddingVertical:2, borderRadius:6, alignSelf:"flex-start", marginTop:4 },
  codeText:            { color:"#00c6ff", fontSize:10, fontWeight:"800" },
  statusBadge:         { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:5, borderRadius:10, borderWidth:1 },
  statusDot:           { width:6, height:6, borderRadius:3 },
  statusText:          { fontSize:10, fontWeight:"800" },
  teacherRow:          { flexDirection:"row", alignItems:"center", gap:10, marginBottom:10 },
  teacherAvatar:       { width:34, height:34, borderRadius:17, backgroundColor:"rgba(167,139,250,0.15)", justifyContent:"center", alignItems:"center" },
  teacherAvatarText:   { color:"#a78bfa", fontSize:12, fontWeight:"800" },
  teacherName:         { color:"#94a3b8", fontSize:13, fontWeight:"600" },
  dateText:            { color:"#374151", fontSize:10, marginTop:1 },
  metaRow:             { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:10 },
  metaChip:            { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.05)", paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  metaChipText:        { fontSize:10, fontWeight:"700" },
  ttPreview:           { flexDirection:"row", alignItems:"flex-start", gap:6, backgroundColor:"rgba(52,211,153,0.06)", padding:10, borderRadius:10, marginBottom:10, borderWidth:1, borderColor:"rgba(52,211,153,0.15)" },
  ttPreviewText:       { color:"#34d399", fontSize:10, flex:1, lineHeight:16 },
  adminNoteBox:        { flexDirection:"row", alignItems:"flex-start", gap:6, backgroundColor:"rgba(255,255,255,0.04)", padding:8, borderRadius:8, marginBottom:8 },
  adminNoteText:       { fontSize:11, fontStyle:"italic", flex:1 },
  actionRow:           { flexDirection:"row", gap:10, marginTop:6 },
  acceptBtn:           { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, backgroundColor:"rgba(52,211,153,0.12)", paddingVertical:11, borderRadius:10, borderWidth:1, borderColor:"rgba(52,211,153,0.25)" },
  acceptBtnText:       { color:"#34d399", fontWeight:"700", fontSize:12 },
  rejectBtn:           { flex:0.55, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, backgroundColor:"rgba(248,113,113,0.12)", paddingVertical:11, borderRadius:10, borderWidth:1, borderColor:"rgba(248,113,113,0.25)" },
  rejectBtnText:       { color:"#f87171", fontWeight:"700", fontSize:12 },
  editTtBtn:           { flexDirection:"row", alignItems:"center", gap:6, backgroundColor:"rgba(167,139,250,0.12)", paddingVertical:8, paddingHorizontal:12, borderRadius:8, alignSelf:"flex-start", marginTop:6, borderWidth:1, borderColor:"rgba(167,139,250,0.25)" },
  editTtBtnText:       { color:"#a78bfa", fontSize:11, fontWeight:"700" },
  empty:               { alignItems:"center", paddingTop:70, gap:10 },
  emptyIcon:           { width:80, height:80, borderRadius:40, backgroundColor:"#1a2535", justifyContent:"center", alignItems:"center" },
  emptyTitle:          { color:"#94a3b8", fontSize:15, fontWeight:"700" },
  emptySub:            { color:"#374151", fontSize:12 },
  modalOverlay:        { flex:1, backgroundColor:"rgba(0,0,0,0.85)", justifyContent:"flex-end" },
  timetableSheet:      { backgroundColor:"#0f1923", borderTopLeftRadius:28, borderTopRightRadius:28, maxHeight:height*0.93, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  handle:              { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.12)", alignSelf:"center", marginTop:12, marginBottom:4 },
  ttHeader:            { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:14 },
  ttTitle:             { color:"#fff", fontSize:16, fontWeight:"800" },
  ttSub:               { color:"#64748b", fontSize:11, marginTop:3 },
  closeBtn:            { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.06)", justifyContent:"center", alignItems:"center" },
  ttInfoRow:           { paddingHorizontal:20, paddingBottom:10, gap:8 },
  ttChip:              { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.06)", paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  ttChipText:          { color:"#64748b", fontSize:11, fontWeight:"600" },
  legendRow:           { flexDirection:"row", gap:16, paddingHorizontal:20, paddingBottom:8 },
  legendItem:          { flexDirection:"row", alignItems:"center", gap:6 },
  legendDot:           { width:12, height:12, borderRadius:6, borderWidth:1.5 },
  legendText:          { color:"#64748b", fontSize:11 },
  loadingConflicts:    { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:20, paddingBottom:8 },
  loadingConflictsText:{ color:"#64748b", fontSize:11 },
  dayTabsScroll:       { borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.05)", maxHeight:50 },
  dayTabsContent:      { paddingHorizontal:16, gap:8, paddingVertical:8, alignItems:"center" },
  dayTab:              { paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor:"#1a2535", borderWidth:1, borderColor:"rgba(255,255,255,0.06)", flexDirection:"row", alignItems:"center", gap:5 },
  dayTabText:          { color:"#64748b", fontSize:12, fontWeight:"700" },
  dayTabBadge:         { width:17, height:17, borderRadius:9, justifyContent:"center", alignItems:"center" },
  dayTabBadgeText:     { color:"#000", fontSize:9, fontWeight:"800" },
  ttBody:              { padding:16, paddingBottom:20 },
  activeDayRow:        { flexDirection:"row", alignItems:"center", gap:8, marginBottom:12 },
  activeDayDot:        { width:8, height:8, borderRadius:4 },
  activeDayLabel:      { fontSize:14, fontWeight:"800" },
  activeDayHint:       { color:"#374151", fontSize:11 },
  slotsGrid:           { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  slotChip:            { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:10, paddingVertical:9, borderRadius:10, borderWidth:1 },
  slotChipText:        { color:"#64748b", fontSize:11 },
  slotBlockedSubject:  { fontSize:8, fontWeight:"700", maxWidth:50 },
  teacherBusyBar:      { flexDirection:"row", alignItems:"flex-start", gap:7, backgroundColor:"rgba(248,113,113,0.08)", padding:10, borderRadius:10, marginBottom:12, borderWidth:1, borderColor:"rgba(248,113,113,0.2)" },
  teacherBusyText:     { color:"#f87171", fontSize:11, flex:1, lineHeight:16 },
  roomSection:         { backgroundColor:"rgba(255,255,255,0.04)", borderRadius:12, padding:12, marginBottom:14, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomSectionTitle:    { color:"#94a3b8", fontSize:12, fontWeight:"700", marginBottom:10 },
  roomChipsWrap:       { marginBottom:12 },
  roomChipsLabel:      { color:"#374151", fontSize:10, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.5, marginBottom:7 },
  roomChipsRow:        { gap:8 },
  roomChip:            { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:11, paddingVertical:7, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.1)", backgroundColor:"rgba(255,255,255,0.04)" },
  roomChipText:        { color:"#64748b", fontSize:11, fontWeight:"700" },
  roomChipCap:         { color:"#374151", fontSize:9 },
  roomChipBooked:      { color:"#f87171", fontSize:9, fontWeight:"800" },
  roomSlotBlock:       { marginBottom:10 },
  roomRow:             { flexDirection:"row", alignItems:"center", gap:8, marginTop:6 },
  roomTimeTag:         { paddingHorizontal:10, paddingVertical:6, borderRadius:8, alignSelf:"flex-start" },
  roomTimeText:        { fontSize:11, fontWeight:"700" },
  roomInput:           { flex:1, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:8, paddingHorizontal:12, paddingVertical:9, color:"#fff", fontSize:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  roomClearBtn:        { padding:2 },
  roomConflictText:    { color:"#f87171", fontSize:10, marginTop:4, marginLeft:2 },
  summaryBox:          { backgroundColor:"rgba(167,139,250,0.08)", borderRadius:12, padding:14, marginBottom:14, borderWidth:1, borderColor:"rgba(167,139,250,0.2)" },
  summaryHeader:       { flexDirection:"row", alignItems:"center", gap:7, marginBottom:10 },
  summaryTitle:        { color:"#a78bfa", fontSize:12, fontWeight:"700" },
  summaryDayRow:       { flexDirection:"row", alignItems:"center", gap:10, marginBottom:7 },
  summaryDayName:      { fontSize:11, fontWeight:"800", width:32 },
  summarySlots:        { flexDirection:"row", flexWrap:"wrap", gap:6, flex:1 },
  summarySlotBadge:    { paddingHorizontal:10, paddingVertical:4, borderRadius:8 },
  summarySlotText:     { fontSize:10, fontWeight:"700" },
  saveBtn:             { borderRadius:14, overflow:"hidden", marginTop:4 },
  saveBtnGrad:         { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:16 },
  saveBtnText:         { color:"#fff", fontWeight:"800", fontSize:15 },
  rejectSheet:         { backgroundColor:"#0f1923", borderTopLeftRadius:22, borderTopRightRadius:22, padding:20, paddingBottom:36, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  rejectHeaderRow:     { flexDirection:"row", alignItems:"center", gap:12, marginBottom:16 },
  rejectIconWrap:      { width:40, height:40, borderRadius:20, backgroundColor:"rgba(248,113,113,0.12)", justifyContent:"center", alignItems:"center" },
  rejectTitle:         { color:"#fff", fontSize:16, fontWeight:"800" },
  rejectSub:           { color:"#64748b", fontSize:12, marginTop:2 },
  fieldLabel:          { color:"#64748b", fontSize:11, fontWeight:"700", marginBottom:8 },
  noteInput:           { backgroundColor:"rgba(255,255,255,0.06)", borderRadius:12, padding:14, color:"#fff", fontSize:14, borderWidth:1, borderColor:"rgba(255,255,255,0.08)", minHeight:110, marginBottom:16 },
  modalBtnRow:         { flexDirection:"row", gap:12 },
  cancelModalBtn:      { flex:1, paddingVertical:13, borderRadius:12, backgroundColor:"rgba(255,255,255,0.06)", alignItems:"center" },
  cancelModalText:     { color:"#64748b", fontWeight:"700" },
  rejectModalBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:7, paddingVertical:13, borderRadius:12, backgroundColor:"rgba(248,113,113,0.85)" },
  rejectModalText:     { color:"#fff", fontWeight:"700" },
});