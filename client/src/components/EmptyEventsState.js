import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const EmptyEventsState = ({ onAddEvent, onOpenGuide }) => (
    <View style={styles.container}>
        <Text style={styles.title}>אין אירועים עדיין</Text>
        <Text style={styles.subtitle}>צור את האירוע הראשון שלך כדי להתחיל לתעד</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={onAddEvent} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>צור אירוע חדש</Text>
        </TouchableOpacity>
        {onOpenGuide ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={onOpenGuide} activeOpacity={0.85}>
                <Text style={styles.secondaryButtonText}>למדריך האפליקציה</Text>
            </TouchableOpacity>
        ) : null}
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
    primaryButton: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#3DD6D0',
        minWidth: 200,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    secondaryButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3DD6D0',
        minWidth: 200,
        backgroundColor: 'rgba(61, 214, 208, 0.08)',
    },
    secondaryButtonText: {
        color: '#0B1A33',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default EmptyEventsState;