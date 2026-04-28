// app/super-admin/settings.js
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Switch, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";

const SettingRow=({icon,label,sub,color="#60a5fa",onPress,right,danger})=>(
  <Pressable style={s.row} onPress={onPress}>
    <View style={[s.rowIcon,{backgroundColor:color+"18",borderColor:color+"30"}]}><Ionicons name={icon} size={18} color={color}/></View>
    <View style={{flex:1}}>
      <Text style={[s.rowLabel,danger&&{color:"#f87171"}]}>{label}</Text>
      {sub&&<Text style={s.rowSub}>{sub}</Text>}
    </View>
    {right||<Ionicons name="chevron-forward" size={14} color="#1f2937"/>}
  </Pressable>
);

export default function SuperAdminSettings(){
  const router=useRouter();
  const [maintenanceMode,setMaintenanceMode]=useState(false);
  const [emailNotifs,setEmailNotifs]=useState(true);
  const [biometric,setBiometric]=useState(false);

  const toggleMaintenance=(val)=>{
    Alert.alert(val?"Enable Maintenance?":"Disable Maintenance?",
      val?"All users will see maintenance mode message and new logins will be blocked.":"System will return to normal mode.",[
      {text:"Cancel",style:"cancel"},
      {text:"Confirm",onPress:async()=>{
        try{await API.post("/super-admin/"+(val?"shutdown":"restore"));setMaintenanceMode(val);}
        catch(e){Alert.alert("Error",e.response?.data?.message||"Failed");}
      }},
    ]);
  };

  const handleLogout=async()=>{
    Alert.alert("Logout","Do you want to logout Super Admin?",[
      {text:"Cancel",style:"cancel"},
      {text:"Logout",style:"destructive",onPress:async()=>{
        try{await API.post("/auth/logout");}catch{}
        await AsyncStorage.multiRemove(["accessToken","refreshToken","superAdminData","superAdminLoggedIn"]);
        router.replace("/login");
      }},
    ]);
  };

  const groups=[
    {
      title:"System Control",
      items:[
        {icon:"construct",label:"Maintenance Mode",sub:"Block user logins temporarily",color:"#f59e0b",
          right:<Switch value={maintenanceMode} onValueChange={toggleMaintenance} trackColor={{false:"#1f2937",true:"#f59e0b60"}} thumbColor={maintenanceMode?"#f59e0b":"#374151"}/>},
        {icon:"notifications",label:"Email Notifications",sub:"System alerts via email",color:"#60a5fa",
          right:<Switch value={emailNotifs} onValueChange={setEmailNotifs} trackColor={{false:"#1f2937",true:"#60a5fa60"}} thumbColor={emailNotifs?"#60a5fa":"#374151"}/>},
        {icon:"finger-print",label:"Biometric Auth",sub:"Admin biometric login",color:"#34d399",
          right:<Switch value={biometric} onValueChange={setBiometric} trackColor={{false:"#1f2937",true:"#34d39960"}} thumbColor={biometric?"#34d399":"#374151"}/>},
      ]
    },
    {
      title:"Data Management",
      items:[
        {icon:"cloud-upload",label:"Export All Data",sub:"Download system-wide CSV/Excel",color:"#00c6ff",onPress:()=>Alert.alert("Coming Soon","Export feature coming soon")},
        {icon:"cloud-download",label:"Backup Database",sub:"Manual DB backup trigger",color:"#a78bfa",onPress:()=>Alert.alert("Coming Soon","Backup feature coming soon")},
        {icon:"trash",label:"Clear Old Logs",sub:"Purge logs older than 90 days",color:"#fb923c",onPress:()=>Alert.alert("Coming Soon","Log purge feature coming soon")},
      ]
    },
    {
      title:"About",
      items:[
        {icon:"information-circle",label:"App Version",sub:"COLLAHUB v1.0.0",color:"#64748b",onPress:()=>{}},
        {icon:"globe",label:"Backend Status",sub:"Check server health",color:"#34d399",onPress:async()=>{
          try{await API.get("/health");Alert.alert(" Online","Backend server is running fine!");}
          catch{Alert.alert(" Offline","Could not connect to backend");}
        }},
        {icon:"document-text",label:"Privacy Policy",sub:"Terms & conditions",color:"#64748b",onPress:()=>Alert.alert("Coming Soon","")},
      ]
    },
    {
      title:"Danger Zone",
      danger:true,
      items:[
        {icon:"power",label:"Emergency Shutdown",sub:"Log out all users instantly",color:"#f87171",danger:true,onPress:()=>router.push("/super-admin/dashboard")},
        {icon:"log-out",label:"Logout",sub:"End your session",color:"#f87171",danger:true,onPress:handleLogout},
      ]
    },
  ];

  return(
    <View style={s.container}>
      <StatusBar barStyle="light-content"/>
      <LinearGradient colors={["#070d1a","#0a1628"]} style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color="#fff"/></Pressable>
        <View style={{flex:1}}><Text style={s.title}>System Settings</Text><Text style={s.sub}>App configuration & preferences</Text></View>
      </LinearGradient>
      <ScrollView contentContainerStyle={{padding:16,paddingBottom:40}} showsVerticalScrollIndicator={false}>
        {groups.map((group,gi)=>(
          <View key={gi} style={{marginBottom:20}}>
            <Text style={[s.groupTitle,group.danger&&{color:"#f87171"}]}>{group.title}</Text>
            <View style={[s.groupCard,group.danger&&{borderColor:"rgba(248,113,113,0.2)"}]}>
              {group.items.map((item,ii)=>(
                <View key={ii} style={ii<group.items.length-1&&s.divider}>
                  <SettingRow {...item}/>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s=StyleSheet.create({
  container:{flex:1,backgroundColor:"#070d1a"},
  header:{flexDirection:"row",alignItems:"center",paddingTop:52,paddingBottom:14,paddingHorizontal:16,gap:12},
  back:{width:38,height:38,borderRadius:12,backgroundColor:"rgba(255,255,255,0.06)",justifyContent:"center",alignItems:"center"},
  title:{color:"#fff",fontSize:17,fontWeight:"800"},sub:{color:"#374151",fontSize:11,marginTop:1},
  groupTitle:{color:"#374151",fontSize:11,fontWeight:"700",letterSpacing:1,textTransform:"uppercase",marginBottom:8},
  groupCard:{backgroundColor:"#0f1b2d",borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:"rgba(255,255,255,0.05)"},
  row:{flexDirection:"row",alignItems:"center",padding:14,gap:12},
  rowIcon:{width:38,height:38,borderRadius:11,justifyContent:"center",alignItems:"center",borderWidth:1},
  rowLabel:{color:"#fff",fontSize:13,fontWeight:"700"},
  rowSub:{color:"#374151",fontSize:11,marginTop:1},
  divider:{borderBottomWidth:1,borderBottomColor:"rgba(255,255,255,0.04)"},
});
