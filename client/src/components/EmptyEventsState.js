import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const EmptyEventsState = ({ onAddEvent }) => (
    <View style={styles.container}>
        <Text style={styles.title}>אין אירועים עדיין</Text>
        <Text style={styles.subtitle}>צור את האירוע הראשון שלך כדי להתחיל לתעד</Text>
        <TouchableOpacity style={styles.button} onPress={onAddEvent} activeOpacity={0.85}>
            <Text style={styles.buttonText}>צור אירוע חדש</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 12,
    },
    button: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#3DD6D0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EmptyEventsState;