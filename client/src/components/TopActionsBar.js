import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const TopActionsBar = ({ isEditMode, onToggleEdit, onViewLogs, onAddEvent, disabled }) => (
    <View style={[styles.container, disabled && styles.disabled]} pointerEvents={disabled ? 'none' : 'auto'}>
        <TouchableOpacity
            style={[styles.button, { backgroundColor: '#A68CF1' }]}
            onPress={onToggleEdit}
            activeOpacity={0.85}
        >
            <Text style={styles.buttonText}>{isEditMode ? '✅ סיים עריכה' : '🎨 מצב עריכה'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, { backgroundColor: '#66D19E' }]}
            onPress={onViewLogs}
            activeOpacity={0.85}
        >
            <Text style={styles.buttonText}>📄 הצג לוגים</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, { backgroundColor: '#3DD6D0' }]}
            onPress={onAddEvent}
            activeOpacity={0.85}
        >
            <Text style={styles.buttonText}>➕ הוסף אירוע</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    disabled: {
        opacity: 0,
    },
    button: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
});

export default TopActionsBar;