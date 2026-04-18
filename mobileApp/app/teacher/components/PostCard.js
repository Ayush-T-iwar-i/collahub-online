// components/PostCard.js
// ✅ Full-featured post card:
//    - Full width display (no small box)
//    - Tap to expand full post
//    - Video with auto-play + controls
//    - Audio player with play/pause
//    - Working like, comment, share
//    - English text throughout

import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, Image,
  Modal, ScrollView, Share, Alert, Dimensions,
  Animated, TextInput, ActivityIndicator,
  Platform, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";
import { Audio } from "expo-av";
import API from "../services/api";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Constants ────────────────────────────────────────────
const ROLE_COLORS = {
  admin:         "#a78bfa",
  teacher:       "#f59e0b",
  student:       "#00c6ff",
  "super-admin": "#f87171",
};
const CAT_COLORS = {
  General:  "#00c6ff",
  Academic: "#34d399",
  Event:    "#a78bfa",
  Holiday:  "#34d399",
  Exam:     "#f87171",
  Alert:    "#f59e0b",
};

const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// ── Audio Player ──────────────────────────────────────────
const AudioPlayer = ({ uri }) => {
  const [sound,     setSound]     = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [position,  setPosition]  = useState(0);
  const [duration,  setDuration]  = useState(0);

  const formatTime = (ms) => {
    if (!ms) return "0:00";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const toggle = async () => {
    try {
      if (!sound) {
        setLoading(true);
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: s } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis || 0);
              setDuration(status.durationMillis || 0);
              setPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        setSound(s);
        setPlaying(true);
        setLoading(false);
      } else {
        if (playing) {
          await sound.pauseAsync();
          setPlaying(false);
        } else {
          await sound.playAsync();
          setPlaying(true);
        }
      }
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Could not play audio");
    }
  };

  React.useEffect(() => {
    return () => { if (sound) sound.unloadAsync(); };
  }, [sound]);

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.audioPlayer}>
      <LinearGradient
        colors={["rgba(52,211,153,0.15)", "rgba(52,211,153,0.05)"]}
        style={styles.audioGrad}
      >
        {/* Waveform icon */}
        <View style={styles.audioWave}>
          {[12, 20, 16, 24, 18, 14, 22, 16, 12, 20].map((h, i) => (
            <View
              key={i}
              style={[
                styles.audioBar,
                { height: h, opacity: playing ? 1 : 0.4 },
                { backgroundColor: playing && i < progress * 10 ? "#34d399" : "#374151" },
              ]}
            />
          ))}
        </View>

        {/* Play button */}
        <Pressable style={styles.audioPlayBtn} onPress={toggle} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#34d399" />
            : <Ionicons
                name={playing ? "pause-circle" : "play-circle"}
                size={44}
                color="#34d399"
              />
          }
        </Pressable>

        {/* Time + progress */}
        <View style={styles.audioInfo}>
          <Text style={styles.audioTitle}>Audio</Text>
          <View style={styles.audioProgressBg}>
            <View style={[styles.audioProgressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.audioTime}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// ── Video Player ──────────────────────────────────────────
const VideoPlayer = ({ uri }) => {
  const videoRef  = useRef(null);
  const [status,  setStatus]  = useState({});
  const [loading, setLoading] = useState(true);

  const isPlaying = status.isPlaying;

  const toggle = async () => {
    if (!videoRef.current) return;
    if (isPlaying) await videoRef.current.pauseAsync();
    else           await videoRef.current.playAsync();
  };

  return (
    <View style={styles.videoWrap}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.videoPlayer}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={setStatus}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />

      {/* Loading overlay */}
      {loading && (
        <View style={styles.videoOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Controls overlay */}
      {!loading && (
        <View style={styles.videoControls}>
          {/* Play/Pause center */}
          <Pressable style={styles.videoPlayBtn} onPress={toggle}>
            {!isPlaying && (
              <View style={styles.videoPlayCircle}>
                <Ionicons name="play" size={28} color="#fff" />
              </View>
            )}
          </Pressable>

          {/* Bottom bar */}
          <View style={styles.videoBottomBar}>
            <Pressable onPress={toggle} style={styles.videoControlBtn}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="#fff"
              />
            </Pressable>
            <View style={styles.videoProgressBg}>
              <View style={[
                styles.videoProgressFill,
                { width: `${status.durationMillis > 0 ? (status.positionMillis / status.durationMillis) * 100 : 0}%` }
              ]} />
            </View>
            <Text style={styles.videoTime}>
              {status.durationMillis
                ? `${Math.floor((status.positionMillis || 0) / 60000)}:${String(Math.floor(((status.positionMillis || 0) / 1000) % 60)).padStart(2, "0")}`
                : "0:00"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// ── Comment Modal ─────────────────────────────────────────
const CommentModal = ({ post, visible, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    if (!post?._id) return;
    setLoading(true);
    try {
      const r = await API.get(`/api/posts/${post._id}/comments`);
      setComments(r.data?.comments || []);
    } catch {}
    finally { setLoading(false); }
  }, [post?._id]);

  React.useEffect(() => { if (visible) load(); }, [visible]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await API.post(`/api/posts/${post._id}/comment`, { text });
      setText("");
      load();
      onCommentAdded?.();
    } catch {
      Alert.alert("Error", "Could not post comment");
    } finally { setSending(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.commentOverlay}>
        <View style={styles.commentSheet}>
          <View style={styles.commentHandle} />
          <View style={styles.commentHeader}>
            <Text style={styles.commentTitle}>
              Comments {comments.length > 0 ? `(${comments.length})` : ""}
            </Text>
            <Pressable onPress={onClose} style={styles.commentCloseBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </Pressable>
          </View>

          {loading
            ? <ActivityIndicator color="#00c6ff" style={{ margin: 24 }} />
            : (
              <FlatList
                data={comments}
                keyExtractor={(_, i) => i.toString()}
                style={{ maxHeight: SCREEN_H * 0.45 }}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={() => (
                  <View style={styles.noComments}>
                    <Ionicons name="chatbubble-outline" size={36} color="#374151" />
                    <Text style={styles.noCommentsText}>No comments yet. Be first!</Text>
                  </View>
                )}
                renderItem={({ item: c }) => {
                  const rc  = ROLE_COLORS[c.userRole] || "#64748b";
                  const ini = (c.userName || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
                  return (
                    <View style={styles.commentItem}>
                      <View style={[styles.commentAvatar, { backgroundColor: rc + "22" }]}>
                        <Text style={[styles.commentAvatarText, { color: rc }]}>{ini}</Text>
                      </View>
                      <View style={styles.commentBody}>
                        <View style={styles.commentNameRow}>
                          <Text style={styles.commentName}>{c.userName || "User"}</Text>
                          <View style={[styles.commentRoleBadge, { backgroundColor: rc + "20" }]}>
                            <Text style={[styles.commentRoleText, { color: rc }]}>
                              {(c.userRole || "user").toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    </View>
                  );
                }}
              />
            )
          }

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={text}
              onChangeText={setText}
              placeholder="Write a comment..."
              placeholderTextColor="#374151"
              multiline
              maxLength={300}
            />
            <Pressable
              style={[styles.commentSendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />
              }
            </Pressable>
          </View>
          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
};

// ── Post Detail Modal (tap to expand) ────────────────────
const PostDetailModal = ({ post, visible, onClose, onLike, likeCount, isLiked, commentCount }) => {
  if (!post) return null;
  const authorName = post.authorName || post.author?.name || "Unknown";
  const authorRole = post.authorRole || post.author?.role || "student";
  const caption    = post.caption || post.content || "";
  const roleColor  = ROLE_COLORS[authorRole] || "#64748b";
  const catColor   = CAT_COLORS[post.category] || "#64748b";
  const ini        = authorName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const [commentVisible, setCommentVisible] = useState(false);
  const [localLiked,     setLocalLiked]     = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [localComments,  setLocalComments]  = useState(commentCount);

  const handleLike = async () => {
    try {
      const r = await API.post(`/api/posts/${post._id}/like`);
      setLocalLiked(r.data.liked);
      setLocalLikeCount(r.data.likeCount);
      onLike?.(post._id, r.data.liked, r.data.likeCount);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${authorName} shared on CollaHub:\n\n${caption}\n\nDownload CollaHub app!`,
        title: "CollaHub Post",
      });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <View style={styles.detailSheet}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <Pressable onPress={onClose} style={styles.detailCloseBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={styles.detailHeaderTitle}>Post</Text>
            <Pressable onPress={handleShare} style={styles.detailShareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Author */}
            <View style={styles.detailAuthor}>
              <View style={[styles.detailAvatar, { backgroundColor: roleColor + "22" }]}>
                <Text style={[styles.detailAvatarText, { color: roleColor }]}>{ini}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailAuthorName}>{authorName}</Text>
                <View style={styles.detailAuthorMeta}>
                  <View style={[styles.detailRoleBadge, { backgroundColor: roleColor + "20" }]}>
                    <Text style={[styles.detailRoleText, { color: roleColor }]}>
                      {authorRole.toUpperCase()}
                    </Text>
                  </View>
                  {post.category && (
                    <View style={[styles.detailCatBadge, { backgroundColor: catColor + "20" }]}>
                      <Text style={[styles.detailCatText, { color: catColor }]}>{post.category}</Text>
                    </View>
                  )}
                  <Text style={styles.detailTime}>{timeAgo(post.createdAt)}</Text>
                </View>
              </View>
            </View>

            {/* Title */}
            {!!post.title && (
              <Text style={styles.detailTitle}>{post.title}</Text>
            )}

            {/* Caption — full text, no truncation */}
            {!!caption && (
              <Text style={styles.detailCaption}>{caption}</Text>
            )}

            {/* Media — full size */}
            {post.mediaType === "image" && !!(post.mediaUrl || post.image) && (
              <Image
                source={{ uri: post.mediaUrl || post.image }}
                style={styles.detailImage}
                resizeMode="contain"
              />
            )}
            {post.mediaType === "video" && !!post.mediaUrl && (
              <VideoPlayer uri={post.mediaUrl} />
            )}
            {post.mediaType === "audio" && !!post.mediaUrl && (
              <AudioPlayer uri={post.mediaUrl} />
            )}

            {/* Actions */}
            <View style={styles.detailActions}>
              <Pressable style={styles.detailActionBtn} onPress={handleLike}>
                <Ionicons
                  name={localLiked ? "heart" : "heart-outline"}
                  size={26}
                  color={localLiked ? "#f87171" : "#64748b"}
                />
                <Text style={[styles.detailActionCount, localLiked && { color: "#f87171" }]}>
                  {localLikeCount}
                </Text>
                <Text style={styles.detailActionLabel}>
                  {localLiked ? "Liked" : "Like"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.detailActionBtn}
                onPress={() => setCommentVisible(true)}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#64748b" />
                <Text style={styles.detailActionCount}>{localComments}</Text>
                <Text style={styles.detailActionLabel}>Comment</Text>
              </Pressable>

              <Pressable style={styles.detailActionBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={24} color="#64748b" />
                <Text style={styles.detailActionCount}></Text>
                <Text style={styles.detailActionLabel}>Share</Text>
              </Pressable>
            </View>
          </ScrollView>

          <CommentModal
            post={post}
            visible={commentVisible}
            onClose={() => setCommentVisible(false)}
            onCommentAdded={() => setLocalComments(n => n + 1)}
          />
        </View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════
// MAIN PostCard — use this in all dashboards
// ══════════════════════════════════════════════════════════
export default function PostCard({ item, onLike, onDelete }) {
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);
  const [localLiked,     setLocalLiked]     = useState(item.isLiked ?? false);
  const [localLikeCount, setLocalLikeCount] = useState(
    item.likeCount ?? (Array.isArray(item.likes) ? item.likes.length : 0)
  );
  const [localComments, setLocalComments] = useState(
    item.commentCount ?? (Array.isArray(item.comments) ? item.comments.length : 0)
  );

  const authorName = item.authorName || item.author?.name || "Unknown";
  const authorRole = item.authorRole || item.author?.role || "student";
  const caption    = item.caption || item.content || "";
  const roleColor  = ROLE_COLORS[authorRole] || "#64748b";
  const catColor   = CAT_COLORS[item.category] || "#64748b";
  const ini        = authorName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const hasMedia   = !!(item.mediaUrl || item.image);
  const mediaUrl   = item.mediaUrl || item.image;

  const handleLike = async () => {
    try {
      const r = await API.post(`/api/posts/${item._id}/like`);
      setLocalLiked(r.data.liked);
      setLocalLikeCount(r.data.likeCount);
      onLike?.(item._id, r.data.liked, r.data.likeCount);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${authorName} shared on CollaHub:\n\n${caption}`,
        title: "CollaHub Post",
      });
    } catch {}
  };

  return (
    <>
      {/* ── Post Card ── */}
      <Pressable style={styles.card} onPress={() => setDetailVisible(true)}>

        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: roleColor + "22" }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>{ini}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{authorName}</Text>
            <View style={styles.authorMeta}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {authorRole.toUpperCase()}
                </Text>
              </View>
              {item.category && (
                <View style={[styles.catBadge, { backgroundColor: catColor + "20" }]}>
                  <Text style={[styles.catText, { color: catColor }]}>{item.category}</Text>
                </View>
              )}
              <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
          {onDelete && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDelete(item)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={15} color="#f87171" />
            </Pressable>
          )}
        </View>

        {/* Title */}
        {!!item.title && (
          <Text style={styles.postTitle}>{item.title}</Text>
        )}

        {/* Caption — show 3 lines, tap for more */}
        {!!caption && (
          <Text style={styles.postCaption} numberOfLines={3}>
            {caption}
          </Text>
        )}
        {caption.length > 120 && (
          <Text style={styles.readMore}>Tap to read more</Text>
        )}

        {/* Media preview */}
        {item.mediaType === "image" && hasMedia && (
          <Image
            source={{ uri: mediaUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        {item.mediaType === "video" && hasMedia && (
          <View style={styles.videoThumb}>
            <LinearGradient
              colors={["rgba(167,139,250,0.2)", "rgba(167,139,250,0.05)"]}
              style={styles.videoThumbGrad}
            >
              <View style={styles.videoPlayCircleSmall}>
                <Ionicons name="play" size={22} color="#fff" />
              </View>
              <View>
                <Text style={styles.videoThumbLabel}>Video</Text>
                <Text style={styles.videoThumbSub}>Tap to play</Text>
              </View>
            </LinearGradient>
          </View>
        )}
        {item.mediaType === "audio" && hasMedia && (
          // Inline audio player in card
          <AudioPlayer uri={mediaUrl} />
        )}

        {/* Footer — Like, Comment, Share */}
        <View style={styles.footer}>
          <Pressable
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation?.(); handleLike(); }}
          >
            <Ionicons
              name={localLiked ? "heart" : "heart-outline"}
              size={21}
              color={localLiked ? "#f87171" : "#64748b"}
            />
            <Text style={[styles.footerCount, localLiked && { color: "#f87171" }]}>
              {localLikeCount}
            </Text>
          </Pressable>

          <Pressable
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation?.(); setCommentVisible(true); }}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#64748b" />
            <Text style={styles.footerCount}>{localComments}</Text>
          </Pressable>

          <Pressable
            style={styles.footerBtn}
            onPress={(e) => { e.stopPropagation?.(); handleShare(); }}
          >
            <Ionicons name="share-social-outline" size={20} color="#64748b" />
            <Text style={styles.footerCount}>Share</Text>
          </Pressable>

          <View style={{ flex: 1 }} />
          <Text style={styles.tapHint}>Tap to expand</Text>
        </View>
      </Pressable>

      {/* Comment Modal */}
      <CommentModal
        post={item}
        visible={commentVisible}
        onClose={() => setCommentVisible(false)}
        onCommentAdded={() => setLocalComments(n => n + 1)}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        post={item}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        isLiked={localLiked}
        likeCount={localLikeCount}
        commentCount={localComments}
        onLike={(id, liked, count) => {
          setLocalLiked(liked);
          setLocalLikeCount(count);
          onLike?.(id, liked, count);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ── Post Card ──────────────────────────────────────────
  card: {
    backgroundColor: "#1a2535",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  authorRow:   { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10, gap: 10 },
  avatar:      { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarText:  { fontSize: 16, fontWeight: "800" },
  authorName:  { color: "#fff", fontSize: 14, fontWeight: "700" },
  authorMeta:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  roleBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleText:    { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  catBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catText:     { fontSize: 9, fontWeight: "700" },
  timeText:    { color: "#374151", fontSize: 11 },
  deleteBtn:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(248,113,113,0.1)", justifyContent: "center", alignItems: "center" },
  postTitle:   { color: "#fff", fontSize: 15, fontWeight: "700", paddingHorizontal: 14, paddingBottom: 6 },
  postCaption: { color: "#94a3b8", fontSize: 14, lineHeight: 21, paddingHorizontal: 14, paddingBottom: 8 },
  readMore:    { color: "#00c6ff", fontSize: 12, fontWeight: "600", paddingHorizontal: 14, paddingBottom: 8 },
  postImage:   { width: "100%", height: Math.round(SCREEN_W * 0.65), backgroundColor: "#0f1923" },

  // Video thumb in card
  videoThumb:      { marginHorizontal: 14, marginBottom: 10, borderRadius: 14, overflow: "hidden" },
  videoThumbGrad:  { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
  videoPlayCircleSmall: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(167,139,250,0.3)", justifyContent: "center", alignItems: "center" },
  videoThumbLabel: { color: "#a78bfa", fontSize: 15, fontWeight: "700" },
  videoThumbSub:   { color: "#64748b", fontSize: 12, marginTop: 2 },

  // Footer
  footer:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", gap: 20 },
  footerBtn:   { flexDirection: "row", alignItems: "center", gap: 6 },
  footerCount: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  tapHint:     { color: "#1f2937", fontSize: 10 },

  // ── Audio Player ───────────────────────────────────────
  audioPlayer:     { marginHorizontal: 14, marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  audioGrad:       { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  audioWave:       { flexDirection: "row", alignItems: "center", gap: 3, width: 60 },
  audioBar:        { width: 4, borderRadius: 2, backgroundColor: "#374151" },
  audioPlayBtn:    { width: 52, height: 52, justifyContent: "center", alignItems: "center" },
  audioInfo:       { flex: 1 },
  audioTitle:      { color: "#34d399", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  audioProgressBg: { height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  audioProgressFill:{ height: 4, backgroundColor: "#34d399", borderRadius: 2 },
  audioTime:       { color: "#64748b", fontSize: 11 },

  // ── Video Player ───────────────────────────────────────
  videoWrap:         { width: "100%", height: Math.round(SCREEN_W * 0.56), backgroundColor: "#000", position: "relative" },
  videoPlayer:       { width: "100%", height: "100%" },
  videoOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  videoControls:     { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  videoPlayBtn:      { flex: 1, justifyContent: "center", alignItems: "center" },
  videoPlayCircle:   { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  videoBottomBar:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "rgba(0,0,0,0.5)" },
  videoControlBtn:   { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  videoProgressBg:   { flex: 1, height: 3, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" },
  videoProgressFill: { height: 3, backgroundColor: "#fff", borderRadius: 2 },
  videoTime:         { color: "#fff", fontSize: 11, minWidth: 36 },

  // ── Comment Modal ──────────────────────────────────────
  commentOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  commentSheet:     { backgroundColor: "#0f1923", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_H * 0.75, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  commentHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  commentHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingBottom: 10 },
  commentTitle:     { color: "#fff", fontSize: 16, fontWeight: "800" },
  commentCloseBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center" },
  noComments:       { alignItems: "center", paddingVertical: 30, gap: 10 },
  noCommentsText:   { color: "#374151", fontSize: 13, textAlign: "center" },
  commentItem:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  commentAvatar:    { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  commentAvatarText:{ fontSize: 13, fontWeight: "800" },
  commentBody:      { flex: 1 },
  commentNameRow:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  commentName:      { color: "#fff", fontSize: 13, fontWeight: "700" },
  commentRoleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  commentRoleText:  { fontSize: 8, fontWeight: "800" },
  commentTime:      { color: "#374151", fontSize: 10 },
  commentText:      { color: "#94a3b8", fontSize: 13, lineHeight: 19 },
  commentInputRow:  { flexDirection: "row", alignItems: "flex-end", padding: 16, paddingTop: 8, gap: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  commentInput:     { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", maxHeight: 80 },
  commentSendBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: "#00c6ff", justifyContent: "center", alignItems: "center" },

  // ── Post Detail Modal ──────────────────────────────────
  detailOverlay:     { flex: 1, backgroundColor: "#0f1923" },
  detailSheet:       { flex: 1 },
  detailHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: "#0f1923", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  detailCloseBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  detailHeaderTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  detailShareBtn:    { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  detailAuthor:      { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  detailAvatar:      { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  detailAvatarText:  { fontSize: 18, fontWeight: "800" },
  detailAuthorName:  { color: "#fff", fontSize: 15, fontWeight: "700" },
  detailAuthorMeta:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  detailRoleBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  detailRoleText:    { fontSize: 10, fontWeight: "800" },
  detailCatBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  detailCatText:     { fontSize: 10, fontWeight: "700" },
  detailTime:        { color: "#374151", fontSize: 12 },
  detailTitle:       { color: "#fff", fontSize: 18, fontWeight: "800", paddingHorizontal: 16, paddingBottom: 8 },
  detailCaption:     { color: "#cbd5e1", fontSize: 15, lineHeight: 24, paddingHorizontal: 16, paddingBottom: 16 },
  detailImage:       { width: SCREEN_W, height: SCREEN_W * 0.75, backgroundColor: "#0a1020" },
  detailActions:     { flexDirection: "row", justifyContent: "space-around", paddingVertical: 20, marginHorizontal: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", marginTop: 16 },
  detailActionBtn:   { alignItems: "center", gap: 4 },
  detailActionCount: { color: "#fff", fontSize: 16, fontWeight: "800" },
  detailActionLabel: { color: "#64748b", fontSize: 12 },
});