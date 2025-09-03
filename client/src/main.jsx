// import { StrictMode } from 'react' // Disabled in dev to prevent double effects
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import App from './App.jsx'
import './styles/global.scss'

const { defaultAlgorithm, darkAlgorithm } = theme

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ConfigProvider
      theme={{
        algorithm: defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorTextBase: '#1e293b',
          colorBgBase: '#ffffff',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif',
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
          },
          Button: {
            borderRadius: 8,
            fontWeight: 500,
          },
          Input: {
            borderRadius: 8,
          },
          Modal: {
            borderRadius: 12,
          },
          Avatar: {
            borderRadius: '50%',
          }
        }
      }}
    >
      <App />
    </ConfigProvider>
  </BrowserRouter>
)
