import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Linking,
  TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import API from "../../services/api";

export default function Notes() {
  const navigation = useNavigation();
  const [notes, setNotes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await API.get("/notes/all");
      const data = res.data?.notes || res.data || [];
      setNotes(data);
      setFiltered(data);
    } catch (error) {
      console.log("Notes load error:", error.message);
      setNotes([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(notes);
      return;
    }
    setFiltered(
      notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(text.toLowerCase()) ||
          n.subjectId?.name?.toLowerCase().includes(text.toLowerCase())
      )
    );
  };

  const openFile = (filename) => {
    if (!filename) return;
    const url = `http://10.0.2.2:5000/uploads/${filename}`;
    Linking.openURL(url).catch(() =>
      console.log("Cannot open file:", url)
    );
  };

  const getFileIcon = (filename) => {
    if (!filename) return "document-outline";
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "pdf") return "document-text";
    if (["jpg", "jpeg", "png"].includes(ext)) return "image";
    if (["doc", "docx"].includes(ext)) return "document";
    return "attach";
  };

  const getFileColor = (filename) => {
    if (!filename) return "#64748b";
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "pdf") return "#f87171";
    if (["jpg", "jpeg", "png"].includes(ext)) return "#34d399";
    if (["doc", "docx"].includes(ext)) return "#60a5fa";
    return "#a78bfa";
  };

  const renderItem = ({ item }) => {
    const color = getFileColor(item.file);
    return (
      <Pressable style={styles.card} onPress={() => openFile(item.file)}>
        <View style={[styles.fileIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={getFileIcon(item.file)} size={24} color={color} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title || "Untitled"}</Text>
          <Text style={styles.noteSubject} numberOfLines={1}>
            {item.subjectId?.name || item.subjectId || "General"}
          </Text>
          <View style={styles.noteMeta}>
            <View style={[styles.fileTag, { backgroundColor: color + "22" }]}>
              <Text style={[styles.fileTagText, { color }]}>
                {item.file?.split(".").pop()?.toUpperCase() || "FILE"}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="download-outline" size={20} color="#374151" />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00c6ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />

      {/* HEADER */}
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Notes</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* SEARCH */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search notes or subject..."
          placeholderTextColor="#374151"
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item._id || i.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadNotes(true)} tintColor="#00c6ff" />
        }
        ListHeaderComponent={() => (
          <Text style={styles.sectionTitle}>
            {filtered.length} {filtered.length === 1 ? "Note" : "Notes"} Available
          </Text>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={56} color="#1f2937" />
            <Text style={styles.emptyTitle}>No Notes Found</Text>
            <Text style={styles.emptyText}>
              {search ? "Try a different search" : "Notes uploaded by teachers will appear here"}
            </Text>
          </View>
        )}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f1923" },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 55, paddingBottom: 16,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a2535", marginHorizontal: 16,
    marginTop: 12, marginBottom: 4,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 12 },
  list: { padding: 16, paddingTop: 8, paddingBottom: 30 },
  sectionTitle: {
    color: "#374151", fontSize: 12, fontWeight: "700",
    letterSpacing: 0.5, marginBottom: 12,
  },
  card: {
    backgroundColor: "#1a2535", borderRadius: 16,
    padding: 16, marginBottom: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  fileIcon: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  cardContent: { flex: 1 },
  noteTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  noteSubject: { color: "#64748b", fontSize: 12, marginTop: 3 },
  noteMeta: { flexDirection: "row", marginTop: 8 },
  fileTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fileTagText: { fontSize: 10, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { color: "#374151", fontSize: 17, fontWeight: "700" },
  emptyText: { color: "#1f2937", fontSize: 13, textAlign: "center" },
});