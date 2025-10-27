import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const options = [
    { key: 'none', label: 'ללא מיון (סדר מקורי)' },
    { key: 'lastPress', label: 'לפי זמן לחיצה אחרונה' },
    { key: 'popularity', label: 'לפי פופולריות (סה״כ לחיצות)' },
    { key: 'createdAt', label: 'לפי זמן יצירה' },
];

const SortOptionsModal = ({ visible, sortMode, onSelect, onClose }) => (
    <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>מיון אירועים</Text>
                {options.map((option) => {
                    const isActive = sortMode === option.key;
                    return (
                        <TouchableOpacity
                            key={option.key}
                            onPress={() => onSelect(option.key)}
                            style={[styles.row, isActive && styles.rowActive]}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.radio, isActive && styles.radioActive]} />
                            <Text style={[styles.rowText, isActive && styles.rowTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                    );
                })}
                <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.modalButton} onPress={onClose}>
                        <Text style={styles.modalButtonText}>סגור</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        width: 320,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 10,
    },
    rowActive: {
        backgroundColor: '#f3f8ff',
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#ccc',
        marginLeft: 8,
    },
    radioActive: {
        borderColor: '#0b69ff',
        backgroundColor: '#0b69ff22',
    },
    rowText: {
        fontSize: 15,
        color: '#333',
    },
    rowTextActive: {
        color: '#0b69ff',
        fontWeight: '700',
    },
    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
});

export default SortOptionsModal;