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
  const label = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
  TIME_SLOTS.push({
    startTime: `${String(h).padStart(2,"0")}:00`,
    endTime:   `${String(h+1).padStart(2,"0")}:00`,
    label,
  });
}

// ══════════════════════════════════════════════════════════
// TIMETABLE MODAL — 3 conflict checks
// ══════════════════════════════════════════════════════════
const TimetableModal = ({ visible, request, onClose, onSaved }) => {
  const [activeDay,        setActiveDay]        = useState("Monday");
  const [selectedSlots,    setSelectedSlots]    = useState({});
  const [roomInputs,       setRoomInputs]       = useState({});
  const [saving,           setSaving]           = useState(false);
  const [blockedTeacher,   setBlockedTeacher]   = useState({});
  const [blockedRoom,      setBlockedRoom]      = useState({});
  const [sameSubjectSlots, setSameSubjectSlots] = useState({});
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  const loadConflicts = async (req) => {
    if (!req) return;
    setLoadingConflicts(true);
    try {
      const res = await API.get("/subject-requests", { params: { status: "accepted" } });
      const allAccepted = res.data?.requests || [];
      const teacherBlocked = {}, roomBlocked = {}, sameSubjBlocked = {};

      allAccepted.forEach(r => {
        if (r._id === req._id) return;
        (r.timetable || []).forEach(slot => {
          const key = `${slot.day}_${slot.startTime}`;
          if (r.teacherId === req.teacherId) teacherBlocked[key] = r.subjectName;

          const isSameSubject = r.subjectId && req.subjectId &&
            r.subjectId.toString() === req.subjectId?.toString();
          const isSameSection =
            r.semester === req.semester &&
            r.admissionYear === req.admissionYear &&
            (r.section === "All" || req.section === "All" || r.section === req.section);
          if (isSameSubject && isSameSection) sameSubjBlocked[key] = r.teacherName;

          if (slot.room?.trim()) {
            const roomKey = `${slot.day}_${slot.startTime}_${slot.room.trim()}`;
            roomBlocked[roomKey] = r.subjectName;
          }
        });
      });

      setBlockedTeacher(teacherBlocked);
      setBlockedRoom(roomBlocked);
      setSameSubjectSlots(sameSubjBlocked);
    } catch (e) {
      console.log("Load conflicts error:", e.message);
    } finally {
      setLoadingConflicts(false);
    }
  };

  React.useEffect(() => {
    if (visible && request) {
      if (request.timetable?.length > 0) {
        const slots = {}, rooms = {};
        request.timetable.forEach(s => {
          const key = `${s.day}_${s.startTime}`;
          slots[key] = { day: s.day, startTime: s.startTime, endTime: s.endTime };
          rooms[key] = s.room || "";
        });
        setSelectedSlots(slots);
        setRoomInputs(rooms);
      } else {
        setSelectedSlots({});
        setRoomInputs({});
      }
      setActiveDay("Monday");
      loadConflicts(request);
    }
  }, [visible, request]);

  const isTeacherBlocked  = (day, st) => blockedTeacher[`${day}_${st}`] || null;
  const isSameSubjectSlot = (day, st) => sameSubjectSlots[`${day}_${st}`] || null;
  const isRoomBlocked     = (day, st, room) => {
    if (!room?.trim()) return null;
    return blockedRoom[`${day}_${st}_${room.trim()}`] || null;
  };

  const toggleSlot = (day, slot) => {
    const key = `${day}_${slot.startTime}`;
    const tc = isTeacherBlocked(day, slot.startTime);
    if (tc) {
      Alert.alert("Time Slot Unavailable",
        `${request.teacherName} already has "${tc}" on ${day} at ${slot.label}.`);
      return;
    }
    const sc = isSameSubjectSlot(day, slot.startTime);
    if (sc) {
      Alert.alert("Subject Already Assigned",
        `"${request.subjectName}" is already assigned to ${sc} on ${day} at ${slot.label} for the same batch/section. Are you sure?`);
    }
    setSelectedSlots(prev => {
      const updated = { ...prev };
      if (updated[key]) delete updated[key];
      else updated[key] = { day, startTime: slot.startTime, endTime: slot.endTime };
      return updated;
    });
  };

  const handleRoomChange = (key, value, day, startTime) => {
    setRoomInputs(prev => ({ ...prev, [key]: value }));
    if (value.trim()) {
      const conflict = isRoomBlocked(day, startTime, value);
      if (conflict) {
        Alert.alert("Room Already Booked",
          `Room ${value} is booked on ${day} at that time for "${conflict}".`);
      }
    }
  };

  const totalSlots = Object.keys(selectedSlots).length;

  const handleSave = async () => {
    if (totalSlots === 0) { Alert.alert("Error", "Please select at least one time slot."); return; }

    for (const [key, slot] of Object.entries(selectedSlots)) {
      const tc = isTeacherBlocked(slot.day, slot.startTime);
      if (tc) { Alert.alert("Conflict Detected", `${request.teacherName} already has "${tc}" on ${slot.day} at ${slot.startTime}.`); return; }
      const room = roomInputs[key];
      if (room?.trim()) {
        const rc = isRoomBlocked(slot.day, slot.startTime, room);
        if (rc) { Alert.alert("Room Conflict", `Room ${room} is booked on ${slot.day} at ${slot.startTime} for "${rc}".`); return; }
      }
    }

    const timetable = Object.values(selectedSlots).map(s => ({
      day: s.day, startTime: s.startTime, endTime: s.endTime,
      room: roomInputs[`${s.day}_${s.startTime}`]?.trim() || "",
    }));

    setSaving(true);
    try {
      await API.put(`/subject-requests/${request._id}/accept`, { timetable });
      onSaved?.();
      Alert.alert("Success",
        `"${request.subjectName}" accepted and timetable assigned to ${request.teacherName}.`,
        [{ text: "OK", onPress: () => onClose() }]
      );
    } catch (e) {
      Alert.alert("Conflict Detected", e.response?.data?.message || e.message || "Could not assign timetable.");
    } finally { setSaving(false); }
  };

  if (!request) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.timetableSheet}>
          <View style={styles.handle} />
          <View style={styles.ttHeader}>
            <View style={{ flex:1 }}>
              <Text style={styles.ttTitle}>Assign Timetable</Text>
              <Text style={styles.ttSub} numberOfLines={1}>{request.subjectName} · {request.teacherName}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ttInfoRow}>
            <View style={styles.ttChip}><Ionicons name="school-outline" size={11} color="#a78bfa" /><Text style={styles.ttChipText} numberOfLines={1}>{request.department?.match(/\(([^)]+)\)/)?.[1] || request.department?.split(" ")[0]}</Text></View>
            <View style={styles.ttChip}><Ionicons name="layers-outline" size={11} color="#f59e0b" /><Text style={styles.ttChipText}>Sem {request.semester}</Text></View>
            <View style={styles.ttChip}><Ionicons name="calendar-outline" size={11} color="#34d399" /><Text style={styles.ttChipText}>Batch {request.admissionYear}</Text></View>
            {request.section && request.section !== "All" && <View style={styles.ttChip}><Ionicons name="people-outline" size={11} color="#00c6ff" /><Text style={styles.ttChipText}>Sec {request.section}</Text></View>}
            {totalSlots > 0 && <View style={[styles.ttChip,{backgroundColor:"rgba(52,211,153,0.15)",borderColor:"#34d399"}]}><Ionicons name="checkmark-circle" size={11} color="#34d399" /><Text style={[styles.ttChipText,{color:"#34d399"}]}>{totalSlots} selected</Text></View>}
          </ScrollView>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"rgba(52,211,153,0.4)",borderColor:"#34d399"}]}/><Text style={styles.legendText}>Available</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"rgba(248,113,113,0.4)",borderColor:"#f87171"}]}/><Text style={styles.legendText}>Teacher Busy</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"rgba(251,146,60,0.4)",borderColor:"#fb923c"}]}/><Text style={styles.legendText}>Subject Taken</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:"rgba(245,158,11,0.4)",borderColor:"#f59e0b"}]}/><Text style={styles.legendText}>Selected</Text></View>
          </View>

          {loadingConflicts && (
            <View style={styles.loadingConflicts}>
              <ActivityIndicator size="small" color="#64748b" />
              <Text style={styles.loadingConflictsText}>Checking availability...</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.dayTabsScroll} contentContainerStyle={styles.dayTabsContent}>
            {DAYS.map(day => {
              const count        = Object.keys(selectedSlots).filter(k => k.startsWith(day)).length;
              const color        = DAY_COLORS[day];
              const isAct        = activeDay === day;
              const blockedCount = TIME_SLOTS.filter(s => isTeacherBlocked(day, s.startTime)).length;
              const sameSubCount = TIME_SLOTS.filter(s => isSameSubjectSlot(day, s.startTime)).length;
              return (
                <Pressable key={day}
                  style={[styles.dayTab, isAct && { backgroundColor: color+"20", borderColor: color+"66" }]}
                  onPress={() => setActiveDay(day)}>
                  <Text style={[styles.dayTabText, isAct && { color }]}>{DAY_SHORT[day]}</Text>
                  {count > 0 && <View style={[styles.dayTabBadge,{backgroundColor:color}]}><Text style={styles.dayTabBadgeText}>{count}</Text></View>}
                  {blockedCount > 0 && count === 0 && <View style={[styles.dayTabBadge,{backgroundColor:"#f87171"}]}><Text style={styles.dayTabBadgeText}>{blockedCount}</Text></View>}
                  {sameSubCount > 0 && count === 0 && blockedCount === 0 && <View style={[styles.dayTabBadge,{backgroundColor:"#fb923c"}]}><Text style={styles.dayTabBadgeText}>{sameSubCount}</Text></View>}
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.ttBody} keyboardShouldPersistTaps="handled">
            <View style={styles.activeDayRow}>
              <View style={[styles.activeDayDot,{backgroundColor:DAY_COLORS[activeDay]}]}/>
              <Text style={[styles.activeDayLabel,{color:DAY_COLORS[activeDay]}]}>{activeDay}</Text>
              <Text style={styles.activeDayHint}>— red=teacher busy, orange=subject taken</Text>
            </View>

            <View style={styles.slotsGrid}>
              {TIME_SLOTS.map(slot => {
                const key        = `${activeDay}_${slot.startTime}`;
                const isSelected = !!selectedSlots[key];
                const tc         = isTeacherBlocked(activeDay, slot.startTime);
                const sc         = isSameSubjectSlot(activeDay, slot.startTime);
                const isBlocked  = !!tc;
                const isSameSub  = !!sc && !tc;
                const color      = DAY_COLORS[activeDay];
                const slotBg     = isBlocked ? "rgba(248,113,113,0.12)" : isSameSub ? "rgba(251,146,60,0.12)" : isSelected ? color+"22" : "rgba(255,255,255,0.04)";
                const slotBorder = isBlocked ? "#f87171" : isSameSub ? "#fb923c" : isSelected ? color : "rgba(255,255,255,0.07)";
                const iconName   = isBlocked ? "close-circle" : isSameSub ? "warning" : isSelected ? "checkmark-circle" : "time-outline";
                const iconColor  = isBlocked ? "#f87171" : isSameSub ? "#fb923c" : isSelected ? color : "#374151";
                return (
                  <Pressable key={key}
                    style={[styles.slotChip,{backgroundColor:slotBg,borderColor:slotBorder,opacity:isBlocked?0.75:1}]}
                    onPress={() => toggleSlot(activeDay, slot)}>
                    <Ionicons name={iconName} size={13} color={iconColor} />
                    <Text style={[styles.slotChipText, isBlocked&&{color:"#f87171",fontSize:10}, isSameSub&&{color:"#fb923c",fontSize:10}, isSelected&&{color,fontWeight:"700"}]}>{slot.label}</Text>
                    {(isBlocked || isSameSub) && (
                      <Text style={[styles.slotBlockedSubject,{color:isBlocked?"#f87171":"#fb923c"}]} numberOfLines={1}>
                        {(tc||sc||"").length > 7 ? (tc||sc).substring(0,7)+"…" : (tc||sc)}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {Object.keys(selectedSlots).filter(k => k.startsWith(activeDay)).length > 0 && (
              <View style={styles.roomSection}>
                <Text style={styles.roomSectionTitle}>Room Numbers (optional)</Text>
                {Object.entries(selectedSlots)
                  .filter(([k]) => k.startsWith(activeDay))
                  .sort(([,a],[,b]) => a.startTime.localeCompare(b.startTime))
                  .map(([key, slot]) => {
                    const room  = roomInputs[key] || "";
                    const rConf = isRoomBlocked(slot.day, slot.startTime, room);
                    return (
                      <View key={key}>
                        <View style={styles.roomRow}>
                          <View style={[styles.roomTimeTag,{backgroundColor:DAY_COLORS[activeDay]+"18"}]}>
                            <Text style={[styles.roomTimeText,{color:DAY_COLORS[activeDay]}]}>{TIME_SLOTS.find(t=>t.startTime===slot.startTime)?.label}</Text>
                          </View>
                          <TextInput
                            style={[styles.roomInput, rConf&&{borderColor:"#f87171",backgroundColor:"rgba(248,113,113,0.08)"}]}
                            placeholder="e.g. A-101" placeholderTextColor="#374151"
                            value={room} onChangeText={v=>handleRoomChange(key,v,slot.day,slot.startTime)} maxLength={10}/>
                          {rConf && <Ionicons name="warning" size={16} color="#f87171"/>}
                        </View>
                        {rConf && <Text style={styles.roomConflictText}>Room {room} is booked for "{rConf}"</Text>}
                      </View>
                    );
                  })}
              </View>
            )}

            {totalSlots > 0 && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="calendar" size={13} color="#a78bfa"/>
                  <Text style={styles.summaryTitle}>Schedule Summary ({totalSlots} slot{totalSlots>1?"s":""})</Text>
                </View>
                {DAYS.map(day => {
                  const daySlots = Object.entries(selectedSlots).filter(([k])=>k.startsWith(day));
                  if (!daySlots.length) return null;
                  return (
                    <View key={day} style={styles.summaryDayRow}>
                      <Text style={[styles.summaryDayName,{color:DAY_COLORS[day]}]}>{DAY_SHORT[day]}</Text>
                      <View style={styles.summarySlots}>
                        {daySlots.map(([key,s])=>(
                          <View key={key} style={[styles.summarySlotBadge,{backgroundColor:DAY_COLORS[day]+"18"}]}>
                            <Text style={[styles.summarySlotText,{color:DAY_COLORS[day]}]}>
                              {TIME_SLOTS.find(t=>t.startTime===s.startTime)?.label}{roomInputs[key]?` · ${roomInputs[key]}`:""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable style={[styles.saveBtn,(saving||totalSlots===0)&&{opacity:0.5}]} onPress={handleSave} disabled={saving||totalSlots===0}>
              <LinearGradient colors={["#10b981","#059669"]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.saveBtnGrad}>
                {saving ? <ActivityIndicator color="#fff"/> : <><Ionicons name="checkmark-circle" size={18} color="#fff"/><Text style={styles.saveBtnText}>Accept & Assign Timetable</Text></>}
              </LinearGradient>
            </Pressable>
            <View style={{height:20}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════
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
  roomSection:         { backgroundColor:"rgba(255,255,255,0.04)", borderRadius:12, padding:12, marginBottom:14, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  roomSectionTitle:    { color:"#94a3b8", fontSize:12, fontWeight:"700", marginBottom:10 },
  roomRow:             { flexDirection:"row", alignItems:"center", gap:10, marginBottom:4 },
  roomTimeTag:         { paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  roomTimeText:        { fontSize:11, fontWeight:"700" },
  roomInput:           { flex:1, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:8, paddingHorizontal:12, paddingVertical:8, color:"#fff", fontSize:13, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
  roomConflictText:    { color:"#f87171", fontSize:10, marginBottom:8, marginLeft:4 },
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