// app/student/notes.js
// Student: My subjects list → tap subject → see teacher-uploaded notes
import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  StatusBar, ActivityIndicator, Alert, Linking, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const FILE_TYPE_META = {
  pdf:   { icon:"document-text", color:"#f87171", label:"PDF"      },
  ppt:   { icon:"easel",         color:"#fb923c", label:"PPT"      },
  doc:   { icon:"document",      color:"#60a5fa", label:"Word"     },
  image: { icon:"image",         color:"#34d399", label:"Image"    },
  other: { icon:"attach",        color:"#a78bfa", label:"File"     },
};
const getFileMeta = (type) => FILE_TYPE_META[type] || FILE_TYPE_META.other;

export default function StudentNotes() {
  const router = useRouter();

  // Screen state: "subjects" | "notes"
  const [screen,       setScreen]       = useState("subjects");
  const [subjects,     setSubjects]     = useState([]);
  const [subLoading,   setSubLoading]   = useState(true);
  const [selSubject,   setSelSubject]   = useState(null);
  const [notes,        setNotes]        = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [search,       setSearch]       = useState("");

  useFocusEffect(useCallback(() => {
    loadSubjects();
  }, []));

  const loadSubjects = async () => {
    setSubLoading(true);
    try {
      const res = await API.get("/subject-requests/student-subjects");
      setSubjects(res.data?.subjects || []);
    } catch {
      // Fallback — try admin subjects
      try {
        const res2 = await API.get("/subject-requests/admin-subjects");
        setSubjects(res2.data?.subjects || []);
      } catch { setSubjects([]); }
    } finally { setSubLoading(false); }
  };

  const openSubject = async (subject) => {
    setSelSubject(subject);
    setScreen("notes");
    setNotesLoading(true);
    try {
      const res = await API.get("/teacher-notes/for-student", {
        params: { subjectName: subject.subjectName },
      });
      setNotes(res.data?.notes || []);
    } catch { setNotes([]); }
    finally { setNotesLoading(false); }
  };

  const openFile = (url) => {
    if (!url) return Alert.alert("Error","File not available");
    Linking.openURL(url).catch(() => Alert.alert("Error","Could not open file"));
  };

  const filteredSubjects = search.trim()
    ? subjects.filter(s =>
        s.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
        s.subjectCode?.toLowerCase().includes(search.toLowerCase())
      )
    : subjects;

  const filteredNotes = search.trim()
    ? notes.filter(n =>
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.description?.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  // ── SUBJECTS SCREEN ─────────────────────────────────────
  if (screen === "subjects") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070d1a" />

        <LinearGradient colors={["#070d1a","#0a1628"]} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notes</Text>
            <Text style={styles.headerSub}>Select a subject to view notes</Text>
          </View>
          <View style={{ width:40 }} />
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color="#64748b" />
          <TextInput style={styles.searchInput}
            placeholder="Search subjects..."
            placeholderTextColor="#374151"
            value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={15} color="#64748b" />
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal:16, paddingBottom:40, paddingTop:8 }}>

          {subLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#00c6ff" />
            </View>
          ) : filteredSubjects.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No subjects found</Text>
              <Text style={styles.emptySub}>
                {search ? "Try a different search" : "Your assigned subjects will appear here"}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.countLabel}>{filteredSubjects.length} subjects</Text>
              {filteredSubjects.map(s => {
                const deptShort = s.department?.match(/\(([^)]+)\)/)?.[1] || s.department?.split(" ")[0] || "";
                return (
                  <Pressable key={s._id || s.subjectName} onPress={() => openSubject(s)}
                    style={styles.subjectCard}>
                    <LinearGradient colors={["rgba(0,198,255,0.12)","rgba(0,198,255,0.04)"]}
                      style={styles.subjectIconBox}>
                      <Ionicons name="book" size={22} color="#00c6ff" />
                    </LinearGradient>
                    <View style={{ flex:1 }}>
                      <Text style={styles.subjectName} numberOfLines={1}>{s.subjectName}</Text>
                      <Text style={styles.subjectMeta}>
                        {deptShort} · Sem {s.semester}
                        {s.admissionYear ? ` · ${s.admissionYear}` : ""}
                        {s.section && s.section!=="All" ? ` · Sec ${s.section}` : ""}
                      </Text>
                      {s.subjectCode ? (
                        <View style={styles.subjectCodeBadge}>
                          <Text style={styles.subjectCodeText}>{s.subjectCode}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.openBtn}>
                      <Ionicons name="folder-open-outline" size={16} color="#00c6ff" />
                      <Text style={styles.openBtnText}>Notes</Text>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── NOTES SCREEN (subject selected) ─────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070d1a" />

      <LinearGradient colors={["#070d1a","#0a1628"]} style={styles.header}>
        <Pressable onPress={() => { setScreen("subjects"); setNotes([]); setSearch(""); setSelSubject(null); }}
          style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{selSubject?.subjectName}</Text>
          <Text style={styles.headerSub}>
            {selSubject?.department?.match(/\(([^)]+)\)/)?.[1]||selSubject?.department?.split(" ")[0]}
            {selSubject?.semester ? ` · Sem ${selSubject.semester}` : ""}
          </Text>
        </View>
        <View style={{ width:40 }} />
      </LinearGradient>

      {/* Search notes */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={15} color="#64748b" />
        <TextInput style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor="#374151"
          value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#64748b" />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom:50, paddingTop:8 }}>

        {notesLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00c6ff" />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={48} color="#374151" />
            <Text style={styles.emptyTitle}>
              {search ? "No notes match search" : "No notes yet"}
            </Text>
            <Text style={styles.emptySub}>
              {search ? "Try a different search" : "Your teacher hasn't uploaded notes for this subject yet"}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.countLabel}>{filteredNotes.length} note{filteredNotes.length!==1?"s":""}</Text>
            {filteredNotes.map(n => {
              const { icon, color, label } = getFileMeta(n.fileType);
              return (
                <Pressable key={n._id} onPress={() => openFile(n.fileUrl)}
                  style={styles.noteCard}>
                  <View style={[styles.noteIconBox, { backgroundColor:color+"18" }]}>
                    <Ionicons name={icon} size={24} color={color} />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={styles.noteTitle} numberOfLines={2}>{n.title}</Text>
                    {n.description ? (
                      <Text style={styles.noteDesc} numberOfLines={2}>{n.description}</Text>
                    ) : null}
                    <View style={styles.noteMeta}>
                      <View style={[styles.typePill, { backgroundColor:color+"18" }]}>
                        <Text style={[styles.typePillText, { color }]}>{label}</Text>
                      </View>
                      <Ionicons name="person-outline" size={11} color="#374151" />
                      <Text style={styles.teacherName} numberOfLines={1}>{n.teacherName}</Text>
                      <Text style={styles.noteDate}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.downloadBtn}>
                    <Ionicons name="download-outline" size={20} color="#00c6ff" />
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex:1, backgroundColor:"#070d1a" },
  center:            { alignItems:"center", paddingTop:60, gap:12 },
  header:            { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:52, paddingBottom:14 },
  backBtn:           { width:40, height:40, borderRadius:12, backgroundColor:"rgba(255,255,255,0.08)", justifyContent:"center", alignItems:"center" },
  headerCenter:      { flex:1, alignItems:"center" },
  headerTitle:       { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:         { color:"#64748b", fontSize:10, marginTop:2 },
  searchBar:         { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#1a2535", marginHorizontal:16, marginTop:10, marginBottom:4, borderRadius:12, paddingHorizontal:12, paddingVertical:2, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  searchInput:       { flex:1, color:"#fff", fontSize:14, paddingVertical:10 },
  countLabel:        { color:"#374151", fontSize:11, fontWeight:"700", letterSpacing:0.5, marginBottom:12 },
  loadingText:       { color:"#374151", fontSize:12 },
  // Subject cards
  subjectCard:       { flexDirection:"row", alignItems:"center", gap:12, backgroundColor:"#1a2535", borderRadius:16, padding:14, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.06)" },
  subjectIconBox:    { width:48, height:48, borderRadius:14, justifyContent:"center", alignItems:"center" },
  subjectName:       { color:"#fff", fontSize:14, fontWeight:"700" },
  subjectMeta:       { color:"#64748b", fontSize:11, marginTop:3 },
  subjectCodeBadge:  { backgroundColor:"rgba(0,198,255,0.1)", paddingHorizontal:8, paddingVertical:2, borderRadius:5, alignSelf:"flex-start", marginTop:5 },
  subjectCodeText:   { color:"#00c6ff", fontSize:10, fontWeight:"700" },
  openBtn:           { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(0,198,255,0.1)", paddingHorizontal:10, paddingVertical:7, borderRadius:9, borderWidth:1, borderColor:"rgba(0,198,255,0.2)" },
  openBtnText:       { color:"#00c6ff", fontSize:11, fontWeight:"700" },
  // Note cards
  noteCard:          { flexDirection:"row", alignItems:"flex-start", gap:12, backgroundColor:"#1a2535", borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.05)" },
  noteIconBox:       { width:50, height:50, borderRadius:14, justifyContent:"center", alignItems:"center" },
  noteTitle:         { color:"#fff", fontSize:14, fontWeight:"700", lineHeight:20 },
  noteDesc:          { color:"#64748b", fontSize:12, marginTop:4, lineHeight:17 },
  noteMeta:          { flexDirection:"row", alignItems:"center", gap:7, marginTop:8, flexWrap:"wrap" },
  typePill:          { paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  typePillText:      { fontSize:10, fontWeight:"800" },
  teacherName:       { color:"#374151", fontSize:10, flex:1 },
  noteDate:          { color:"#1f2937", fontSize:10 },
  downloadBtn:       { padding:4 },
  // Empty
  empty:             { alignItems:"center", paddingTop:60, gap:12 },
  emptyTitle:        { color:"#374151", fontSize:16, fontWeight:"700" },
  emptySub:          { color:"#1f2937", fontSize:12, textAlign:"center", paddingHorizontal:20 },
});