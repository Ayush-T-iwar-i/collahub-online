import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SubjectDetail() {
  const { subject } = useLocalSearchParams();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadDetails();
  }, []);

  const loadDetails = async () => {
    const data = await AsyncStorage.getItem("attendanceData");
    const parsed = JSON.parse(data);

    const subjectData = parsed.find(
      (s) => s.subject === subject
    );

    if (!subjectData) return;

    // Dummy daily records
    const dummyDays = [
      { date: "01-02-2026", status: "Present" },
      { date: "03-02-2026", status: "Absent" },
      { date: "05-02-2026", status: "Present" },
    ];

    setRecords(dummyDays);

    setSummary({
      total: subjectData.totalClasses,
      attended: subjectData.attended,
      absent:
        subjectData.totalClasses -
        subjectData.attended,
    });
  };

  if (!summary) return null;

  return (
    <View style={styles.container}>
      {/* 🔥 Summary */}
      <View style={styles.summaryBox}>
        <Text>Total Classes: {summary.total}</Text>
        <Text>Attended: {summary.attended}</Text>
        <Text>Absent: {summary.absent}</Text>
      </View>

      {/* 📋 Day Wise Attendance */}
      <FlatList
        data={records}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.date}</Text>
            <Text
              style={{
                color:
                  item.status === "Present"
                    ? "green"
                    : "red",
              }}
            >
              {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f2f4f8",
  },
  summaryBox: {
    backgroundColor: "#9290ea",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 10,
  },
});