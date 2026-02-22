import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="warning-outline" size={48} color={COLORS.coral} />
                        </View>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </Text>
                        <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                            <Ionicons name="refresh" size={18} color={COLORS.text.inverse} />
                            <Text style={styles.retryText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    content: {
        alignItems: 'center',
        gap: SPACING.m,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.round,
        backgroundColor: 'rgba(239, 100, 97, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    title: {
        color: COLORS.text.primary,
        fontFamily: FONTS.display,
        fontSize: 22,
        textAlign: 'center',
    },
    message: {
        color: COLORS.text.muted,
        fontFamily: FONTS.body,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: SPACING.m,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        borderRadius: BORDER_RADIUS.s,
        backgroundColor: COLORS.primary,
        marginTop: SPACING.s,
    },
    retryText: {
        color: COLORS.text.inverse,
        fontFamily: FONTS.heading,
        fontSize: 15,
    },
});
