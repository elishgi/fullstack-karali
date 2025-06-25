import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Button,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Linking,
  Modal,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { getLogs } from '../services/api';
import { BarChart } from 'react-native-chart-kit';
import { SwipeListView } from 'react-native-swipe-list-view';

const BASE_URL = 'http://192.168.8.111:4000';
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [eventName, setEventName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [eventOptions, setEventOptions] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showGraph, setShowGraph] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const scrollRef = useRef();
  const graphRef = useRef();

  useEffect(() => {
    fetchLogs();
    fetchEventNames();
  }, []);

  useEffect(() => {
    if (showGraph && graphRef.current && scrollRef.current) {
      setTimeout(() => {
        graphRef.current.measureLayout(
          scrollRef.current,
          (x, y) => {
            scrollRef.current.scrollTo({ y, animated: true });
          }
        );
      }, 300);
    }
  }, [showGraph]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'שגיאה לא ידועה';
      console.error('❌ Error fetching logs:', message);
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (logId) => {
    Alert.alert('מחיקת תיעוד', 'האם אתה בטוח שברצונך למחוק את התיעוד?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/logs/${logId}`);
            fetchLogs();
          } catch (error) {
            console.error('שגיאה במחיקת לוג:', error);
          }
        },
      },
    ]);
  };

  const fetchEventNames = async () => {
    try {
      const response = await api.get('/api/events/names');
      setEventOptions(response.data);
    } catch (error) {
      console.error('Error fetching event names:', error);
    }
  };

  const handleEventInputChange = (text) => {
    setEventName(text);
    const filtered = eventOptions.filter((name) => name.toLowerCase().includes(text.toLowerCase()));
    setFilteredEvents(filtered);
  };

  const toggleFilterPanel = () => {
    const toValue = filterVisible ? SCREEN_WIDTH : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setFilterVisible(!filterVisible);
  };

  const isFilterActive = () => {
    return fromDate || toDate || eventName || timeOfDay;
  };

  const applyFilter = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate.toISOString();
      if (toDate) params.toDate = toDate.toISOString();
      if (eventName) params.eventName = eventName;
      if (timeOfDay) params.timeOfDay = timeOfDay;

      const response = await api.get('/api/logs', { params });
      setLogs(response.data);
      toggleFilterPanel();
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'שגיאה לא ידועה';
      console.error('❌ Error filtering logs:', message);
    } finally {
      setLoading(false);
    }
  };


  const resetFilters = () => {
    setFromDate(null);
    setToDate(null);
    setEventName('');
    setTimeOfDay('');
    setFilteredEvents([]);
    fetchLogs();
  };

  const handleFilterButtonPress = () => {
    if (isFilterActive()) {
      resetFilters();
    } else {
      toggleFilterPanel();
    }
  };

  const openInMaps = (location) => {
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    Linking.openURL(url);
  };

  const handleImagePress = (uri) => {
    setSelectedImageUri(uri);
    setModalVisible(true);
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.eventName?.toLowerCase().includes(searchText.toLowerCase()) ||
      log.comment?.toLowerCase().includes(searchText.toLowerCase())
  );

  const buildGraphData = () => {
    const counts = {};
    logs.forEach((log) => {
      counts[log.eventName] = (counts[log.eventName] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts) }],
    };
  };


  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.cell}>{item.eventName}</Text>
      <Text style={styles.cell}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      <Text style={styles.cell}>{new Date(item.timestamp).toLocaleDateString()}</Text>
      <Text style={styles.cell}>{item.comment}</Text>
      {item.imageUri ? (
        <TouchableOpacity onPress={() => handleImagePress(item.imageUri)}>
          <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
        </TouchableOpacity>
      ) : (
        <Text style={styles.cell}>—</Text>
      )}
      {item.location?.lat && item.location?.lng ? (
        <TouchableOpacity onPress={() => openInMaps(item.location)}>
          <Text style={styles.mapLink}>📍 מפה</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.cell}>—</Text>
      )}

    </View>
  );
  const renderHiddenItem = (data) => (
    <View style={styles.hiddenRow}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteLog(data.item._id)}>
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>🗑️ מחק</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} style={styles.container}>
        <Text style={styles.titleCentered}>לוח תיעודים:</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="🔍 חפש לפי שם אירוע או הערה"
          value={searchText}
          onChangeText={setSearchText}
        />

        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilterButtonPress}>
            <Text style={styles.filterButtonText}>
              {isFilterActive() ? 'מחק סינון' : 'סינון'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowGraph(!showGraph)}>
            <Text style={styles.filterButtonText}>
              {showGraph ? 'הסתר גרף' : 'הצג גרף'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>אירוע</Text>
          <Text style={styles.headerCell}>שעה</Text>
          <Text style={styles.headerCell}>תאריך</Text>
          <Text style={styles.headerCell}>הערה</Text>
          <Text style={styles.headerCell}>תמונה</Text>
          <Text style={styles.headerCell}>מיקום</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#000" />
        ) : (
          <SwipeListView
            data={filteredLogs}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-75}
            disableRightSwipe
            scrollEnabled={false}
          />
        )}

        {showGraph && (
          <View ref={graphRef} style={{ marginTop: 20 }}>
            <BarChart
              data={buildGraphData()}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
                labelColor: () => '#000',
              }}
              style={{ marginVertical: 20, borderRadius: 8, alignSelf: 'center' }}
            />
          </View>
        )}
      </ScrollView>

      {/* פאנל סינון צדדי */}
      <Animated.View style={[styles.filterPanel, { right: slideAnim }]}>
        <View style={styles.panelContent}>
          <Text style={styles.labelRight}>מתאריך:</Text>
          <Button title={fromDate ? fromDate.toLocaleDateString() : 'בחר'} onPress={() => setShowFromPicker(true)} />
          {showFromPicker && (
            <DateTimePicker
              value={fromDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowFromPicker(false);
                if (selectedDate) setFromDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.labelRight}>עד תאריך:</Text>
          <Button title={toDate ? toDate.toLocaleDateString() : 'בחר'} onPress={() => setShowToPicker(true)} />
          {showToPicker && (
            <DateTimePicker
              value={toDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowToPicker(false);
                if (selectedDate) setToDate(selectedDate);
              }}
            />
          )}

          <Text style={styles.labelRight}>שם אירוע:</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: ניקיון"
            value={eventName}
            onChangeText={handleEventInputChange}
          />
          {filteredEvents.length > 0 && (
            <View style={styles.suggestionBox}>
              {filteredEvents.map((name, index) => (
                <TouchableWithoutFeedback key={index} onPress={() => {
                  setEventName(name);
                  setFilteredEvents([]);
                }}>
                  <View style={styles.suggestionItem}>
                    <Text>{name}</Text>
                  </View>
                </TouchableWithoutFeedback>
              ))}
            </View>
          )}

          <Text style={styles.labelRight}>חלק מהיום:</Text>
          <TextInput
            style={styles.input}
            placeholder="בוקר / צהריים / ערב / לילה"
            value={timeOfDay}
            onChangeText={setTimeOfDay}
          />

          <View style={styles.footerAligned}>
            <Button title="בצע סינון" onPress={applyFilter} />
            <Button title="סגור" color="#ccc" onPress={toggleFilterPanel} />
          </View>
        </View>
      </Animated.View>

      {/* תצוגת תמונה מוגדלת */}
      <Modal visible={modalVisible} transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <Image source={{ uri: selectedImageUri }} style={styles.fullImage} />
          <Button title="סגור" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  titleCentered: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    textAlign: 'right',
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterButtonText: {
    color: '#000',
    fontSize: 16,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 2,
    borderBottomColor: '#888',
    paddingBottom: 6,
    marginBottom: 6,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'center',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 10,
  },
  mapLink: {
    color: '#007bff',
    textAlign: 'center',
    marginTop: 4,
  },
  filterPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: '#fff',
    elevation: 5,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  panelContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  labelRight: {
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  suggestionBox: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginTop: 4,
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  footerAligned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hiddenRow: {
    alignItems: 'flex-end',
    backgroundColor: '#f00',
    flex: 1,
    justifyContent: 'center',
    paddingRight: 15,
    borderRadius: 6,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#d11a2a',
    padding: 10,
    borderRadius: 6,
  },
});
