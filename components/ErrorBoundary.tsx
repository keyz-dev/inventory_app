import React from 'react';
import { Alert, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Show alert with error details
    Alert.alert(
      'App Error',
      `Something went wrong: ${error.message}`,
      [
        { 
          text: 'Restart App', 
          onPress: () => {
            this.setState({ hasError: false, error: undefined });
          }
        }
      ]
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20,
          backgroundColor: '#fff'
        }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: '#e74c3c',
            marginBottom: 10,
            textAlign: 'center'
          }}>
            Something went wrong
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#666',
            textAlign: 'center',
            marginBottom: 20
          }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </Text>
          <Text style={{ 
            fontSize: 12, 
            color: '#999',
            textAlign: 'center'
          }}>
            Tap "Restart App" in the alert to continue
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}


