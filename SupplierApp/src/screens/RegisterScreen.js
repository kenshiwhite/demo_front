import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { register } from '../api/auth';

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        role: 'client',
        company_name: '',
        phone: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRegister = async () => {
        if (!form.username || !form.email || !form.password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        setLoading(true);
        try {
            await register(form);
            Alert.alert('Success', 'Account created! Please login.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Registration failed. Try a different username.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join as a client or supplier</Text>

            <TextInput
                style={styles.input}
                placeholder="Username *"
                value={form.username}
                onChangeText={(v) => handleChange('username', v)}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Email *"
                value={form.email}
                onChangeText={(v) => handleChange('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password *"
                value={form.password}
                onChangeText={(v) => handleChange('password', v)}
                secureTextEntry
            />
            <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={form.company_name}
                onChangeText={(v) => handleChange('company_name', v)}
            />
            <TextInput
                style={styles.input}
                placeholder="Phone"
                value={form.phone}
                onChangeText={(v) => handleChange('phone', v)}
                keyboardType="phone-pad"
            />

            <Text style={styles.label}>I am a:</Text>
            <View style={styles.roleContainer}>
                <TouchableOpacity
                    style={[styles.roleButton, form.role === 'client' && styles.roleActive]}
                    onPress={() => handleChange('role', 'client')}
                >
                    <Text style={[styles.roleText, form.role === 'client' && styles.roleTextActive]}>
                        Client
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roleButton, form.role === 'supplier' && styles.roleActive]}
                    onPress={() => handleChange('role', 'supplier')}
                >
                    <Text style={[styles.roleText, form.role === 'supplier' && styles.roleTextActive]}>
                        Supplier
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Create Account</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Already have an account? Login</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        fontSize: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1a1a1a',
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    roleActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#4F46E5',
    },
    roleText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    roleTextActive: {
        color: '#fff',
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    link: {
        textAlign: 'center',
        color: '#4F46E5',
        fontSize: 14,
    },
});