import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Alert,
  BackHandler,
  ToastAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const cardRef = useRef(null);
  const router = useRouter();
  const backPressCount = useRef(0);

  // 🔥 Load data every time screen focuses
 useFocusEffect(
  useCallback(() => {
    const loadData = async () => {
      const data = await AsyncStorage.getItem("studentData");

      if (data) {
        const parsedStudent = JSON.parse(data);
        setStudent(parsedStudent);

        // 🔥 Load image according to studentId
        const savedImage = await AsyncStorage.getItem(
          `profileImage_${parsedStudent.studentId}`
        );

        if (savedImage) {
          setProfileImage(savedImage);
        } else {
          setProfileImage(null);
        }
      }
    };

    loadData();
  }, [])
);

  // 🔥 Change Profile Image
  const changeProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImage = result.assets[0].uri;

      setProfileImage(newImage);
      await AsyncStorage.setItem(
  `profileImage_${student.studentId}`,
  newImage
);
    }
  };

  // 🔥 Back Button Logic
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          ToastAndroid.show(
            "Press back again to go to Dashboard",
            ToastAndroid.SHORT
          );

          setTimeout(() => {
            backPressCount.current = 0;
          }, 2000);

          return true;
        }

        router.replace("/student/dashboard");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  const downloadCard = async () => {
    try {
      const uri = await captureRef(cardRef.current, {
        format: "png",
        quality: 1,
      });

      const fileUri =
        FileSystem.documentDirectory + "student-id-card.png";

      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Success", "ID Card saved successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to download ID card");
    }
  };

  if (!student) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const imageSource =
    profileImage ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.card}
        ref={cardRef}
        collapsable={false}
      >
        {/* 🔥 College Name from DB */}
        <Text style={styles.college}>
          {student.college || "ABC COLLEGE"}
        </Text>

        {/* 🔥 Profile Image with Edit Icon */}
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageSource }} style={styles.image} />

          <Pressable style={styles.editIcon} onPress={changeProfileImage}>
            <MaterialIcons name="edit" size={18} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.id}>ID: {student.studentId}</Text>
        <Text style={styles.dept}>{student.department}</Text>

        <View style={{ marginTop: 15 }}>
          <QRCode
            value={student.studentId?.toString() || "N/A"}
            size={80}
            backgroundColor="white"
          />
        </View>
      </LinearGradient>

      <View style={styles.detailsCard}>
        <Text style={styles.heading}>Student Information</Text>

        <Info label="Email" value={student.email} />
        <Info label="Admission Year" value={student.admissionYear} />
        <Info label="Role" value={student.role} />
      </View>

      <Pressable style={styles.downloadBtn} onPress={downloadCard}>
        <Text style={styles.downloadText}>Download ID Card</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 14, color: "#666" }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        {value || "N/A"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fa",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    margin: 20,
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 8,
  },
  college: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 15,
  },
  imageWrapper: {
    position: "relative",
    marginBottom: 15,
  },
  image: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#fff",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#ff9800",
    padding: 6,
    borderRadius: 15,
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  id: {
    color: "#fff",
    fontSize: 16,
    marginTop: 5,
  },
  dept: {
    color: "#fff",
    fontSize: 16,
    marginTop: 3,
  },
  detailsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    elevation: 5,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  downloadBtn: {
    backgroundColor: "#667eea",
    margin: 20,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  downloadText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});