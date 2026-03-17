import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, StatusBar, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export default function AdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const r = await API.get("/notifications");
      setNotifications(r.data?.notifications || []);
    } catch (e) {
      console.log("Load notifications error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadNotifications(); }, []));

  const markAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { }
  };

  const deleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) {
      Alert.alert("Error", "Could not delete notification");
    }
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteNotification(id) }
    ]);
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.isRead;
    return (
      <Pressable 
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => markAsRead(item._id, item.isRead)}
        onLongPress={() => confirmDelete(item._id)}
      >
        <View style={[styles.iconBox, { backgroundColor: isUnread ? "rgba(244,114,182,0.15)" : "rgba(255,255,255,0.05)" }]}>
          <Ionicons name="notifications" size={20} color={isUnread ? "#f472b6" : "#64748b"} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.title, isUnread && { color: "#fff" }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.time}>{item.createdAt ? timeAgo(item.createdAt) : ""}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1923" />
      
      <LinearGradient colors={["#0f1923", "#1a2a3a"]} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Notifications</Text>
        <Pressable onPress={markAllRead} style={styles.actionBtn}>
          <Ionicons name="checkmark-done-outline" size={22} color="#a78bfa" />
        </Pressable>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f472b6" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#374151" />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>You have no new notifications.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)"
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(167,139,250,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
  
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1a2535", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.03)"
  },
  unreadCard: { borderColor: "rgba(244,114,182,0.2)", backgroundColor: "rgba(244,114,182,0.03)" },
  
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  title: { color: "#cbd5e1", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  message: { color: "#94a3b8", fontSize: 13, lineHeight: 18 },
  time: { color: "#64748b", fontSize: 11, marginTop: 6, fontWeight: "600" },
  
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f472b6" },

  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyTitle: { color: "#94a3b8", fontSize: 18, fontWeight: "700", marginTop: 16 },
  emptyText: { color: "#64748b", fontSize: 14, marginTop: 8 },
});
