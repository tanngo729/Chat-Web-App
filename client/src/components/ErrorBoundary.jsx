import React from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px'
        }}>
          <Result
            status="500"
            title="Something went wrong"
            subTitle="An unexpected error occurred. Please try refreshing the page."
            extra={[
              <Button type="primary" onClick={this.handleReload} key="reload">
                Reload Page
              </Button>,
              <Button onClick={this.handleReset} key="retry">
                Try Again
              </Button>
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                marginTop: '16px',
                fontSize: '12px',
                maxWidth: '600px'
              }}>
                <summary>Error Details (Development)</summary>
                <div style={{ marginTop: '8px' }}>
                  <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Component Stack:</strong>
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;