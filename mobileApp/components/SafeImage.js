// components/SafeImage.js
import React from "react";
import { Image, View, Text } from "react-native";

export default function SafeImage({ uri, size = 44, initials = "?", color = "#a78bfa", style }) {
  const isValid = uri && (uri.startsWith("http://") || uri.startsWith("https://"));
  if (isValid) {
    return (
      <Image
        source={{ uri }}
        style={[{ width:size, height:size, borderRadius:size/2 }, style]}
        resizeMode="cover"
        onError={()=>{}}
      />
    );
  }
  return (
    <View style={[{ width:size, height:size, borderRadius:size/2, backgroundColor:color+"22", justifyContent:"center", alignItems:"center" }, style]}>
      <Text style={{ color, fontSize:size*0.35, fontWeight:"800" }}>{initials}</Text>
    </View>
  );
}