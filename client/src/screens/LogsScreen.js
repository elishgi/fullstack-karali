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
        <View style={styles.headerWrapper}>
          <Text style={styles.title}>לוח התיעודים</Text>
          <Text style={styles.subtitle}>
            ניהול חכם של כל הרגעים – חיפוש, סינון וסקירה מהירה
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>חיפוש מהיר</Text>
          <TextInput
            style={styles.input}
            placeholder="🔍 חפש לפי שם אירוע או הערה"
            placeholderTextColor="#8b96a8"
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
                {isFilterActive() ? 'מחק סינון' : 'סינון מתקדם'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sectionCard, styles.dualButtonsCard]}>
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

        {filterVisible && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>סינון מתקדם</Text>

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

            <View style={styles.filterRow}>
              <Text style={styles.label}>שם אירוע</Text>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, styles.filterInput]}
                  placeholder="לדוגמה: ניקיון"
                  placeholderTextColor="#8b96a8"
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
              <Text style={styles.label}>חלק מהיום</Text>
              <TextInput
                style={[styles.input, styles.filterInput]}
                placeholder="בוקר / צהריים / ערב / לילה"
                placeholderTextColor="#8b96a8"
                value={timeOfDay}
                onChangeText={setTimeOfDay}
                textAlign="right"
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={applyFilter}
              >
                <Text style={styles.primaryButtonText}>החל סינון</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={toggleFilterPanel}
              >
                <Text style={styles.secondaryButtonText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                הצג, ערוך ומחק בקלות את כל התיעודים הקיימים
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

            <View style={styles.modalSummaryRow}>
              <Text style={styles.modalSummaryText}>
                {`תיעוד ראשון: ${formatDateTime(selectedTemporary?.summary?.firstLog?.timestamp)}`}
              </Text>
              <Text style={styles.modalSummaryText}>
                {`תיעוד אחרון: ${formatDateTime(selectedTemporary?.summary?.lastLog?.timestamp)}`}
              </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f4f7fb',
    flexGrow: 1,
    gap: 18,
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
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d8e2f0',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
    textAlign: 'right',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7a8f',
    textAlign: 'right',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1f2933',
  },
  quickActionsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  filterButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c6d6e6',
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#f6fbff',
  },
  filterButtonActive: {
    borderColor: ACCENT,
    backgroundColor: '#e7fbfa',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  filterButtonTextActive: {
    color: ACCENT_DARK,
  },
  dualButtonsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dualButtonsCard: {
    gap: 0,
    paddingVertical: 14,
  },
  dualButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c6d6e6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f6fbff',
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  selectorButtonText: {
    fontSize: 15,
    color: '#1f2933',
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
    gap: 12,
    marginTop: 6,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ecf2f8',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#1f2933',
    fontSize: 15,
    fontWeight: '600',
  },
  graphCard: {
    alignItems: 'center',
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16,
  },
  logsList: {
    gap: 14,
  },
  logCard: {
    backgroundColor: '#f9fbff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e3ecf7',
    gap: 10,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2933',
  },
  logTimestamp: {
    fontSize: 13,
    color: '#6b7a8f',
  },
  deletePill: {
    width: 40,
    height: 40,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e1f7f5',
  },
  badgeText: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: '600',
  },
  logComment: {
    fontSize: 15,
    color: '#1f2933',
    textAlign: 'right',
    lineHeight: 20,
  },
  logCommentMuted: {
    fontSize: 15,
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
    paddingVertical: 10,
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
    gap: 14,
  },
  tempEventCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3ecf7',
    padding: 16,
    backgroundColor: '#f9fbff',
    gap: 12,
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 16,
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
    minHeight: 120,
    width: '100%',
  },
  modalLogsScroll: {
    width: '100%',
  },
  modalLogsList: {
    gap: 12,
    paddingBottom: 16,
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
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
