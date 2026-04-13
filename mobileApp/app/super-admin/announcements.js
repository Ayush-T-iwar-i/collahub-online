// app/super-admin/announcements.js
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Alert, StatusBar, Modal, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import API from "../../services/api";

const timeAgo=(date)=>{
  if(!date)return"—";
  const diff=Date.now()-new Date(date);
  const m=Math.floor(diff/60000);
  if(m<1)return"Just now";if(m<60)return`${m}m ago`;
  const h=Math.floor(m/60);if(h<24)return`${h}h ago`;
  return`${Math.floor(h/24)}d ago`;
};

export default function SuperAdminAnnouncements(){
  const router=useRouter();
  const [announcements,setAnnouncements]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({title:"",message:"",type:"general"});
  const [saving,setSaving]=useState(false);

  useFocusEffect(useCallback(()=>{load();},[  ]));

  const load=async()=>{
    setLoading(true);
    try{const r=await API.get("/super-admin/announcements");setAnnouncements(r.data?.announcements||r.data||[]);}
    catch{setAnnouncements([]);}
    finally{setLoading(false);}
  };

  const send=async()=>{
    if(!form.title.trim()||!form.message.trim())return Alert.alert("Required","Title aur message dono chahiye");
    setSaving(true);
    try{
      await API.post("/super-admin/broadcast",{...form,message:form.message,subject:form.title});
      setModal(false);setForm({title:"",message:"",type:"general"});
      Alert.alert("Sent!","Announcement sent to all users");load();
    }catch(e){Alert.alert("Error",e.response?.data?.message||"Failed");}
    finally{setSaving(false);}
  };

  const del=(item)=>Alert.alert("Delete","Delete karna chahte ho?",[
    {text:"Cancel",style:"cancel"},
    {text:"Delete",style:"destructive",onPress:async()=>{
      try{await API.delete(`/super-admin/announcements/${item._id}`);setAnnouncements(p=>p.filter(a=>a._id!==item._id));}
      catch(e){Alert.alert("Error",e.response?.data?.message||"Failed");}
    }}
  ]);

  const TYPES=[
    {key:"general",label:"General",color:"#60a5fa"},
    {key:"urgent", label:"Urgent", color:"#f87171"},
    {key:"event",  label:"Event",  color:"#34d399"},
    {key:"exam",   label:"Exam",   color:"#f59e0b"},
  ];

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>Announcements</Text><Text style={s.sub}>Global & college-wide notices</Text></View>
        <Pressable onPress={()=>setModal(true)} style={s.addBtn}><Ionicons name="add" size={20} color="#f59e0b"/></Pressable>
      </LinearGradient>

      {loading?<ActivityIndicator size="large" color="#f59e0b" style={{marginTop:50}}/>:(
        <FlatList data={announcements} keyExtractor={(i,idx)=>i._id||String(idx)}
          contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={s.empty}>
              <Ionicons name="megaphone-outline" size={44} color="#1f2937"/>
              <Text style={s.emptyT}>No announcements yet</Text>
              <Pressable onPress={()=>setModal(true)} style={s.createBtn}>
                <Text style={s.createBtnT}>Create First Announcement</Text>
              </Pressable>
            </View>
          )}
          renderItem={({item})=>{
            const typeInfo=TYPES.find(t=>t.key===item.type)||TYPES[0];
            return(
              <View style={s.card}>
                <View style={[s.typeDot,{backgroundColor:typeInfo.color}]}/>
                <View style={{flex:1}}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.title||item.subject||"Announcement"}</Text>
                    <View style={[s.typeBadge,{backgroundColor:typeInfo.color+"15",borderColor:typeInfo.color+"40"}]}>
                      <Text style={[s.typeBadgeT,{color:typeInfo.color}]}>{typeInfo.label}</Text>
                    </View>
                  </View>
                  <Text style={s.cardMsg} numberOfLines={2}>{item.message}</Text>
                  <Text style={s.cardTime}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Pressable onPress={()=>del(item)} style={s.delBtn}><Ionicons name="trash-outline" size={14} color="#f87171"/></Pressable>
              </View>
            );
          }}
        />
      )}

      <Pressable style={s.fab} onPress={()=>setModal(true)}>
        <LinearGradient colors={["#f59e0b","#d97706"]} style={s.fabGrad}>
          <Ionicons name="add" size={24} color="#fff"/>
        </LinearGradient>
      </Pressable>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={()=>!saving&&setModal(false)}>
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.handle}/>
              <View style={s.sheetHeader}>
                <LinearGradient colors={["#f59e0b","#d97706"]} style={s.sheetIcon}>
                  <Ionicons name="megaphone" size={17} color="#fff"/>
                </LinearGradient>
                <View style={{flex:1}}><Text style={s.sheetTitle}>New Announcement</Text><Text style={s.sheetSub}>Send to all users</Text></View>
                <Pressable onPress={()=>setModal(false)} style={s.closeBtn}><Ionicons name="close" size={17} color="#64748b"/></Pressable>
              </View>
              <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingBottom:50}} keyboardShouldPersistTaps="handled">
                <Text style={s.fieldLabel}>Type</Text>
                <View style={s.typeRow}>
                  {TYPES.map(t=>(
                    <Pressable key={t.key} onPress={()=>setForm(p=>({...p,type:t.key}))}
                      style={[s.typeChip,form.type===t.key&&{borderColor:t.color+"60",backgroundColor:t.color+"15"}]}>
                      <Text style={[s.typeChipT,form.type===t.key&&{color:t.color}]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Title *</Text>
                <View style={s.input}>
                  <TextInput style={s.inputT} placeholder="Announcement title..." placeholderTextColor="#374151"
                    value={form.title} onChangeText={v=>setForm(p=>({...p,title:v}))}/>
                </View>
                <Text style={s.fieldLabel}>Message *</Text>
                <TextInput style={s.textarea} placeholder="Message please..." placeholderTextColor="#374151"
                  value={form.message} onChangeText={v=>setForm(p=>({...p,message:v}))}
                  multiline maxLength={500} textAlignVertical="top"/>
                <Text style={s.charCount}>{form.message.length}/500</Text>
                <Pressable style={[s.sendBtn,saving&&{opacity:0.6}]} onPress={send} disabled={saving}>
                  <LinearGradient colors={["#f59e0b","#d97706"]} style={s.sendGrad}>
                    {saving?<ActivityIndicator size="small" color="#fff"/>:<><Ionicons name="send" size={15} color="#fff"/><Text style={s.sendT}>Send to All Users</Text></>}
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#070d1a"},
  header:{flexDirection:"row",alignItems:"center",paddingTop:52,paddingBottom:14,paddingHorizontal:16,gap:12},
  back:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  title:{color:"#fff",fontSize:17,fontWeight:"800"},sub:{color:"#374151",fontSize:11,marginTop:1},
  addBtn:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(245,158,11,0.1)",justifyContent:"center",alignItems:"center"},
  card:{flexDirection:"row",alignItems:"flex-start",backgroundColor:"#0f1b2d",borderRadius:14,padding:14,marginBottom:8,gap:12,borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  typeDot:{width:4,borderRadius:2,height:"100%",minHeight:40,marginTop:4},
  cardTop:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:4},
  cardTitle:{color:"#fff",fontSize:13,fontWeight:"700",flex:1},
  typeBadge:{paddingHorizontal:8,paddingVertical:2,borderRadius:8,borderWidth:1},
  typeBadgeT:{fontSize:9,fontWeight:"700"},
  cardMsg:{color:"#64748b",fontSize:12,lineHeight:17},
  cardTime:{color:"#1f2937",fontSize:10,marginTop:6},
  delBtn:{width:28,height:28,borderRadius:8,backgroundColor:"rgba(248,113,113,0.1)",justifyContent:"center",alignItems:"center"},
  fab:{position:"absolute",bottom:30,right:20},
  fabGrad:{width:52,height:52,borderRadius:26,justifyContent:"center",alignItems:"center"},
  empty:{alignItems:"center",paddingTop:60,gap:12},emptyT:{color:"#374151",fontSize:14,fontWeight:"700"},
  createBtn:{backgroundColor:"rgba(245,158,11,0.1)",paddingHorizontal:20,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:"rgba(245,158,11,0.3)"},
  createBtnT:{color:"#f59e0b",fontWeight:"700",fontSize:13},
  overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.8)",justifyContent:"flex-end"},
  sheet:{backgroundColor:"#0a1220",borderTopLeftRadius:26,borderTopRightRadius:26,maxHeight:"90%",borderWidth:1,borderColor:"rgba(255,255,255,0.07)"},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:"rgba(255,255,255,0.1)",alignSelf:"center",marginTop:12,marginBottom:4},
  sheetHeader:{flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.06)"},
  sheetIcon:{width:40,height:40,borderRadius:12,justifyContent:"center",alignItems:"center"},
  sheetTitle:{color:"#fff",fontSize:16,fontWeight:"800"},sheetSub:{color:"#374151",fontSize:11},
  closeBtn:{width:30,height:30,borderRadius:15,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  fieldLabel:{color:"#94a3b8",fontSize:11,fontWeight:"700",letterSpacing:0.5,textTransform:"uppercase",marginTop:16,marginBottom:8},
  typeRow:{flexDirection:"row",gap:8,flexWrap:"wrap",marginBottom:4},
  typeChip:{paddingHorizontal:14,paddingVertical:7,borderRadius:20,borderWidth:1,borderColor:"rgba(255,255,255,0.1)",backgroundColor:"rgba(255,255,255,0.04)"},
  typeChipT:{color:"#64748b",fontSize:12,fontWeight:"600"},
  input:{backgroundColor:"#0f1b2d",borderRadius:12,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderColor:"rgba(255,255,255,0.07)"},
  inputT:{color:"#fff",fontSize:13},
  textarea:{backgroundColor:"#0f1b2d",borderRadius:12,padding:14,color:"#fff",fontSize:13,minHeight:110,borderWidth:1,borderColor:"rgba(255,255,255,0.07)"},
  charCount:{color:"#1f2937",fontSize:11,textAlign:"right",marginTop:4,marginBottom:4},
  sendBtn:{borderRadius:14,overflow:"hidden",marginTop:14},
  sendGrad:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:15},
  sendT:{color:"#fff",fontSize:15,fontWeight:"800"},
});
