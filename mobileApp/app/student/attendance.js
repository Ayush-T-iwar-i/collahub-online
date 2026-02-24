import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Attendance() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    const data = await AsyncStorage.getItem("attendanceData");

    if (data) {
      setSubjects(JSON.parse(data));
    } else {
      // Dummy Data (jab tak teacher backend nahi hai)
      const dummy = [
        {
          subject: "Math",
          totalClasses: 30,
          attended: 26,
        },
        {
          subject: "Physics",
          totalClasses: 28,
          attended: 20,
        },
      ];

      await AsyncStorage.setItem(
        "attendanceData",
        JSON.stringify(dummy)
      );
      setSubjects(dummy);
    }
  };

  const calculatePercent = (attended, total) => {
    return total === 0
      ? 0
      : Math.round((attended / total) * 100);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={subjects}
        keyExtractor={(item) => item.subject}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push(`/student/attendance/${item.subject}`)
            }
          >
            <Text style={styles.subject}>
              {item.subject}
            </Text>

            <Text style={styles.percent}>
              {calculatePercent(
                item.attended,
                item.totalClasses
              )}
              %
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f8",
    padding: 20,
  },
  card: {
    backgroundColor: "#9290ea",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subject: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  percent: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});