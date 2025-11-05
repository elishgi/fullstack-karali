import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Linking,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import api, {
  deleteEventAndLogs,
  getLogs,
  getTemporaryEventsOverview,
} from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ACCENT = '#3dd6d0';
const ACCENT_DARK = '#0f766e';
const CARD_BG = '#ffffff';

const formatDateTime = (value, includeTime = true) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const dateString = date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  if (!includeTime) {
    return dateString;
  }
  const timeString = date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateString} • ${timeString}`;
};

export default function LogsScreen() {
  const navigation = useNavigation();
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
  const [activeFilters, setActiveFilters] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  const [temporaryEvents, setTemporaryEvents] = useState([]);
  const [temporaryLoading, setTemporaryLoading] = useState(true);
  const [temporaryModalVisible, setTemporaryModalVisible] = useState(false);
  const [selectedTemporary, setSelectedTemporary] = useState(null);
  const [temporaryLogs, setTemporaryLogs] = useState([]);
  const [temporaryLogsLoading, setTemporaryLogsLoading] = useState(false);

  const scrollRef = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    fetchLogs();
    fetchEventNames();
    fetchTemporaryEvents();
  }, []);

  useEffect(() => {
    if (showGraph && graphRef.current && scrollRef.current) {
      setTimeout(() => {
        graphRef.current?.measureLayout(
          scrollRef.current,
          (_x, y) => scrollRef.current?.scrollTo({ y, animated: true })
        );
      }, 300);
    }
  }, [showGraph]);

  const fetchLogs = async (overrideFilters) => {
    setLoading(true);
    try {
      const filters = overrideFilters ?? activeFilters;
      let data = [];

      if (filters && Object.keys(filters).length > 0) {
        const response = await api.get('/api/logs', { params: filters });
        data = response.data;
      } else {
        data = await getLogs();
      }

      setLogs(data);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || 'שגיאה לא ידועה';
      console.error('❌ Error fetching logs:', message);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת טעינת התיעודים.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemporaryEvents = async () => {
    setTemporaryLoading(true);
    try {
      const data = await getTemporaryEventsOverview();
      setTemporaryEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching temporary events:', error);
    } finally {
      setTemporaryLoading(false);
    }
  };

  const fetchTemporaryLogs = async (eventId) => {
    setTemporaryLogsLoading(true);
    try {
      if (!eventId) {
        setTemporaryLogs([]);
        return;
      }
      const response = await api.get('/api/logs', { params: { eventId } });
      setTemporaryLogs(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching temporary logs:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת טעינת התיעודים הזמניים.');
    } finally {
      setTemporaryLogsLoading(false);
    }
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
    const filtered = eventOptions.filter((nameOption) =>
      nameOption.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEvents(filtered);
  };

  const toggleFilterPanel = () => {
    setFilterVisible((prev) => !prev);
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const isFilterActive = () => {
    return Boolean(activeFilters && Object.keys(activeFilters).length > 0);
  };

  const applyFilter = async () => {
    const params = {};
    if (fromDate) params.fromDate = fromDate.toISOString();
    if (toDate) params.toDate = toDate.toISOString();
    if (eventName) params.eventName = eventName;
    if (timeOfDay) params.timeOfDay = timeOfDay;

    setActiveFilters(Object.keys(params).length ? params : null);
    await fetchLogs(params);
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setFromDate(null);
    setToDate(null);
    setEventName('');
    setTimeOfDay('');
    setFilteredEvents([]);
    setActiveFilters(null);
    setFilterVisible(false);
    fetchLogs({});
  };

  const handleFilterButtonPress = () => {
    if (isFilterActive()) {
      resetFilters();
    } else {
      toggleFilterPanel();
    }
  };

  const openInMaps = (location) => {
    if (!location?.lat || !location?.lng) return;
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    Linking.openURL(url);
  };

  const handleDownloadTemporarySummary = async (eventId) => {
    if (!eventId) {
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('שגיאה', 'לא נמצא טוקן משתמש להורדה.');
        return;
      }
      const baseURL = api.defaults?.baseURL?.replace(/\/$/, '');
      if (!baseURL) {
        Alert.alert('שגיאה', 'לא נמצא שרת להורדת הקובץ.');
        return;
      }
      const url = `${baseURL}/api/events/${eventId}/temporary-summary-export?token=${encodeURIComponent(
        token
      )}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('שגיאה', 'לא ניתן לפתוח את קובץ הייצוא.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('❌ Error exporting temporary event:', error);
      Alert.alert('שגיאה', 'לא הצלחנו להוריד את קובץ הייצוא.');
    }
  };

  const handleImagePress = (uri) => {
    setSelectedImageUri(uri);
    setModalVisible(true);
  };

  const handleDeleteLog = (logId, eventIdForRefresh) => {
    Alert.alert('מחיקת תיעוד', 'האם אתה בטוח שברצונך למחוק את התיעוד?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/logs/${logId}`);
            await fetchLogs();
            if (eventIdForRefresh) {
              await fetchTemporaryLogs(eventIdForRefresh);
            }
            fetchTemporaryEvents();
          } catch (error) {
            console.error('שגיאה במחיקת לוג:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה במחיקת התיעוד.');
          }
        },
      },
    ]);
  };

  const handleTemporaryCardPress = async (item) => {
    setSelectedTemporary(item);
    setTemporaryModalVisible(true);
    await fetchTemporaryLogs(item?.event?._id);
  };

  const handleDeleteTemporaryEvent = (eventId) => {
    if (!eventId) {
      return;
    }
    Alert.alert(
      'מחיקת אירוע זמני',
      'האם למחוק את האירוע וכל התיעודים שנשמרו בו?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventAndLogs(eventId);
              await fetchLogs();
              await fetchTemporaryEvents();
              setTemporaryModalVisible(false);
              setSelectedTemporary(null);
              setTemporaryLogs([]);
            } catch (error) {
              console.error('שגיאה במחיקת אירוע זמני:', error);
              Alert.alert('שגיאה', 'לא הצלחנו למחוק את האירוע הזמני.');
            }
          },
        },
      ]
    );
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(
      (log) =>
        log.eventName?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.comment?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [logs, searchText]);

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

  const handleRefresh = () => {
    fetchLogs();
    fetchTemporaryEvents();
  };

  const closeTemporaryModal = () => {
    setTemporaryModalVisible(false);
    setSelectedTemporary(null);
    setTemporaryLogs([]);
  };

  const renderLogCard = (log, eventIdForRefresh, variant = 'default') => (
    <View
      key={log._id}
      style={[
        styles.logCard,
        variant === 'modal' && styles.modalLogCard,
      ]}
    >
      <View style={styles.logCardHeader}>
        <View style={styles.logHeaderTexts}>
          <Text style={styles.logEventName}>{log.eventName || 'ללא שם'}</Text>
          <Text style={styles.logTimestamp}>{formatDateTime(log.timestamp)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deletePill}
          onPress={() => handleDeleteLog(log._id, eventIdForRefresh)}
          activeOpacity={0.8}
        >
          <Text style={styles.deletePillText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logBadgesRow}>
        {log.timeOfDay ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{log.timeOfDay}</Text>
          </View>
        ) : null}
        {log.dayOfWeek ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{log.dayOfWeek}</Text>
          </View>
        ) : null}
      </View>

      <Text style={log.comment ? styles.logComment : styles.logCommentMuted}>
        {log.comment || 'אין הערה'}
      </Text>

      <View style={styles.logActionsRow}>
        {log.imageUri ? (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleImagePress(log.imageUri)}
          >
            <Text style={styles.linkButtonText}>📷 צפייה בתמונה</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.logActionPlaceholder}>ללא תמונה</Text>
        )}

        {log.location?.lat && log.location?.lng ? (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openInMaps(log.location)}
          >
            <Text style={styles.linkButtonText}>📍 פתיחת מפה</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.logActionPlaceholder}>ללא מיקום</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>חזור</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerWrapper}>
          <Text style={styles.title}>לוח התיעודים</Text>
          <Text style={styles.subtitle}>
            ניהול חכם של כל התעודים – חיפוש, סינון וסקירה מהירה
          </Text>
        </View>

        <View style={[styles.sectionCard, styles.quickSearchCard]}>
          <Text style={styles.sectionTitle}>חיפוש מהיר</Text>
          <TextInput
            style={styles.inputCompact}
            placeholder="🔍 חפש לפי שם אירוע או הערה"
            placeholderTextColor="#7b8594"
            value={searchText}
            onChangeText={setSearchText}
            textAlign="right"
          />
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                isFilterActive() && styles.filterButtonActive,
              ]}
              onPress={handleFilterButtonPress}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isFilterActive() && styles.filterButtonTextActive,
                ]}
              >
                {isFilterActive() ? 'ניקוי סינון' : 'סינון מתקדם'}
              </Text>
            </TouchableOpacity>
          </View>

          {filterVisible && (
            <>
              <View style={styles.advancedFilterBox}>
                

                <View style={styles.filterRow}>
                  <Text style={styles.label}>מתאריך</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowFromPicker(true)}
                  >
                    <Text style={styles.selectorButtonText}>
                      {fromDate ? formatDateTime(fromDate, false) : 'בחר תאריך'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.label}>עד תאריך</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowToPicker(true)}
                  >
                    <Text style={styles.selectorButtonText}>
                      {toDate ? formatDateTime(toDate, false) : 'בחר תאריך'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.label}>שם אירוע</Text>
                  <View style={styles.filterInputWrapper}>
                    <TextInput
                      style={[styles.inputCompact, styles.filterInput]}
                      placeholder="לדוגמה: ניקיון"
                      placeholderTextColor="#7b8594"
                      value={eventName}
                      onChangeText={handleEventInputChange}
                      textAlign="right"
                    />
                    {filteredEvents.length > 0 && (
                      <View style={styles.suggestionBox}>
                        {filteredEvents.map((nameOption) => (
                          <TouchableOpacity
                            key={nameOption}
                            onPress={() => {
                              setEventName(nameOption);
                              setFilteredEvents([]);
                            }}
                            style={styles.suggestionItem}
                          >
                            <Text style={styles.suggestionText}>{nameOption}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.filterRow}>
                  <Text style={styles.label}>זמן ביום</Text>
                  <View style={styles.timePillsRow}>
                    {['בוקר', 'צהריים', 'ערב', 'לילה'].map((time) => {
                      const isActive = timeOfDay === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timePill,
                            isActive && styles.timePillActive,
                          ]}
                          onPress={() =>
                            setTimeOfDay((prev) => (prev === time ? '' : time))
                          }
                        >
                          <Text
                            style={[
                              styles.timePillText,
                              isActive && styles.timePillTextActive,
                            ]}
                          >
                            {time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.applyFilterButton]}
                    onPress={applyFilter}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.primaryButtonText}>החל סינון</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.resetFilterButton]}
                    onPress={resetFilters}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.secondaryButtonText}>איפוס</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showFromPicker && (
                <DateTimePicker
                  value={fromDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) setFromDate(selectedDate);
                  }}
                />
              )}

              {showToPicker && (
                <DateTimePicker
                  value={toDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(_event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) setToDate(selectedDate);
                  }}
                />
              )}
            </>
          )}
        </View>

        <View style={[styles.sectionCard, styles.dualButtonsCard, styles.graphActionsCard]}>
          <View style={styles.dualButtonsRow}>
            <TouchableOpacity
              style={[
                styles.dualButton,
                showGraph && styles.dualButtonActive,
              ]}
              onPress={() => setShowGraph((prev) => !prev)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.dualButtonText,
                  showGraph && styles.dualButtonTextActive,
                ]}
              >
                {showGraph ? 'הסתר גרף' : 'הצג גרף'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dualButton}
              onPress={handleRefresh}
              activeOpacity={0.85}
            >
              <Text style={styles.dualButtonText}>🔄 רענון</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showGraph && (
          <View ref={graphRef} style={[styles.sectionCard, styles.graphCard]}>
            <Text style={styles.sectionTitle}>התפלגות תיעודים לפי אירוע</Text>
            <BarChart
              data={buildGraphData()}
              width={SCREEN_WIDTH - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`,
                labelColor: () => '#1f2933',
                style: { borderRadius: 16 },
              }}
              style={styles.chart}
            />
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>תיעודים אחרונים</Text>
              <Text style={styles.sectionSubtitle}>
                הצג, ערוך ומחק בקלות את התיעודים הקיימים
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={ACCENT_DARK} />
          ) : filteredLogs.length === 0 ? (
            <Text style={styles.emptyStateText}>אין תיעודים להצגה כרגע.</Text>
          ) : (
            <View style={styles.logsList}>
              {filteredLogs.map((log) => renderLogCard(log, log.eventId))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>אירועים זמניים</Text>
              <Text style={styles.sectionSubtitle}>
                כל האירועים הזמניים מרוכזים כאן לגישה מהירה וממוקדת
              </Text>
            </View>
          </View>

          {temporaryLoading ? (
            <ActivityIndicator size="large" color={ACCENT_DARK} />
          ) : temporaryEvents.length === 0 ? (
            <Text style={styles.emptyStateText}>אין אירועים זמניים פעילים כרגע.</Text>
          ) : (
            <View style={styles.temporaryList}>
              {temporaryEvents.map((item) => (
                <TouchableOpacity
                  key={item?.event?._id}
                  style={styles.tempEventCard}
                  onPress={() => handleTemporaryCardPress(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.tempEventHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tempEventName}>
                        {item?.event?.name || 'אירוע זמני'}
                      </Text>
                      <Text style={styles.tempEventMeta}>
                        {`סה"כ ${item?.summary?.totalLogs || 0} תיעודים`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: item?.event?.color || '#e5e7eb' },
                      ]}
                    />
                  </View>

                  <View style={styles.tempEventDetailsRow}>
                    <Text style={styles.tempEventDetail}>
                      {`ראשון: ${formatDateTime(item?.summary?.firstLog?.timestamp)}`}
                    </Text>
                    <Text style={styles.tempEventDetail}>
                      {`אחרון: ${formatDateTime(item?.summary?.lastLog?.timestamp)}`}
                    </Text>
                  </View>

                  {item?.summary?.byTimeOfDay &&
                    Object.keys(item.summary.byTimeOfDay).length > 0 && (
                      <View style={styles.tempBadgesRow}>
                        {Object.entries(item.summary.byTimeOfDay).map(([key, value]) => (
                          <View key={key} style={styles.badge}>
                            <Text style={styles.badgeText}>{`${key}: ${value}`}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.imageModalCard}>
            <Image source={{ uri: selectedImageUri }} style={styles.fullImage} />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={temporaryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeTemporaryModal}
      >
        <View style={styles.modalBackground}>
          <View style={styles.temporaryModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedTemporary?.event?.name || 'אירוע זמני'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {`סה"כ ${selectedTemporary?.summary?.totalLogs || 0} תיעודים`}
                </Text>
              </View>
              <TouchableOpacity onPress={closeTemporaryModal}>
                <Text style={styles.closeButtonText}>✖️</Text>
              </TouchableOpacity>
            </View>


            <View style={styles.modalLogsContainer}>
              {temporaryLogsLoading ? (
                <ActivityIndicator size="large" color={ACCENT_DARK} />
              ) : temporaryLogs.length === 0 ? (
                <Text style={styles.emptyStateText}>אין תיעודים זמניים להצגה.</Text>
              ) : (
                <ScrollView
                  style={styles.modalLogsScroll}
                  contentContainerStyle={styles.modalLogsList}
                  showsVerticalScrollIndicator={false}
                >
                  {temporaryLogs.map((log) =>
                    renderLogCard(log, log.eventId, 'modal')
                  )}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, styles.exportButton]}
              onPress={() =>
                handleDownloadTemporarySummary(selectedTemporary?.event?._id)
              }
            >
              <Text style={styles.exportButtonText}>⬇️ הורד סיכום לאקסל</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.deleteAllButton]}
              onPress={() => handleDeleteTemporaryEvent(selectedTemporary?.event?._id)}
            >
              <Text style={styles.deleteAllButtonText}>🗑️ מחק את האירוע וכל התיעודים</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: '#f5f7fb',
    flexGrow: 1,
    gap: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7eefc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  backButtonIcon: {
    fontSize: 16,
    color: '#1f2933',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  headerWrapper: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#1f2933',
  },
  subtitle: {
    fontSize: 15,
    color: '#51606f',
    textAlign: 'right',
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f0e3d8ff',
    shadowColor: '#141313ff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  quickSearchCard: {
    backgroundColor: '#eef4ff',
    borderColor: '#c8d9ff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7a8f',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  inputCompact: {
    borderWidth: 1,
    borderColor: '#cfd6e6',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: '#fff',
    color: '#1f2933',
  },
  quickActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  filterButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c0d2ea',
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#f3f8ff',
  },
  filterButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#e7fbfa',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2933',
  },
  filterButtonTextActive: {
    color: ACCENT_DARK,
  },
  advancedFilterBox: {
    marginTop: 14,
    backgroundColor: '#f7f9ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2dcf3',
    padding: 12,
    gap: 6,
  },
  advancedFilterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'right',
  },
  dualButtonsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dualButtonsCard: {
    gap: 8,
    paddingVertical: 12,
  },
  graphActionsCard: {
    backgroundColor: '#fff4e6',
    borderColor: '#ffd8b5',
  },
  dualButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c0d2ea',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fefefe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#e7fbfa',
  },
  dualButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  dualButtonTextActive: {
    color: ACCENT_DARK,
  },
  filterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2f3c4a',
  },
  selectorButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  selectorButtonText: {
    fontSize: 15,
    color: '#1f2933',
  },
  filterInputWrapper: {
    flex: 1,
  },
  filterInput: {
    marginTop: 0,
  },
  suggestionBox: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8e2f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2fa',
  },
  suggestionText: {
    textAlign: 'right',
    fontSize: 14,
    color: '#1f2933',
  },
  filterActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  applyFilterButton: {
    flex: 1,
  },
  resetFilterButton: {
    flex: 1,
  },
  timePillsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 2,
  },
  timePill: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  timePillActive: {
    borderColor: ACCENT,
    backgroundColor: '#e7fbfa',
  },
  timePillText: {
    fontSize: 13,
    color: '#1f2933',
  },
  timePillTextActive: {
    color: ACCENT_DARK,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ecf2f8',
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d2ddec',
  },
  secondaryButtonText: {
    color: '#1f2933',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#b9e5e5ff',
    shadowOpacity: 0,
    flex: 0,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#cafbfeff',
    marginTop: 4,
  },
  exportButtonText: {
    color: '#1d657fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  graphCard: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16,
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    backgroundColor: '#f9fbff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3ecf7',
    gap: 8,
  },
  modalLogCard: {
    backgroundColor: '#ffffff',
  },
  logCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logHeaderTexts: {
    alignItems: 'flex-end',
    gap: 4,
    flex: 1,
  },
  logEventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6b7a8f',
  },
  deletePill: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePillText: {
    fontSize: 18,
  },
  logBadgesRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#e1f7f5',
  },
  badgeText: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: '600',
  },
  logComment: {
    fontSize: 14,
    color: '#1f2933',
    textAlign: 'right',
    lineHeight: 19,
  },
  logCommentMuted: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'right',
  },
  logActionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT_DARK,
  },
  logActionPlaceholder: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 15,
    color: '#6b7a8f',
  },
  temporaryList: {
    gap: 10,
  },
  tempEventCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3ecf7',
    padding: 12,
    backgroundColor: '#f9fbff',
    gap: 10,
  },
  tempEventHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  tempEventName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'right',
  },
  tempEventMeta: {
    fontSize: 13,
    color: '#6b7a8f',
    textAlign: 'right',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8e2f0',
  },
  tempEventDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  tempEventDetail: {
    fontSize: 13,
    color: '#52616f',
  },
  tempBadgesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(11, 21, 33, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imageModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    width: '90%',
  },
  fullImage: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  temporaryModalCard: {
    width: '92%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7a8f',
    textAlign: 'right',
    marginTop: 2,
  },
  closeButtonText: {
    fontSize: 20,
  },
  modalSummaryRow: {
    flexDirection: 'column',
    gap: 6,
  },
  modalSummaryText: {
    fontSize: 14,
    color: '#52616f',
    textAlign: 'right',
  },
  modalLogsContainer: {
    flex: 1,
    width: '100%',
    height:'100',
  },
  modalLogsScroll: {
    width: '100%',
    
    
  },
  modalLogsList: {
    gap: 5,
    paddingBottom: 1,
    
  },
  deleteAllButton: {
    backgroundColor: '#fee2e2',
    shadowOpacity: 0,
    flex: 0,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 4,
  },
  deleteAllButtonText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    
  },
});
