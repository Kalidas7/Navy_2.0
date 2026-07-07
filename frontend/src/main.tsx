import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/app/App';
import { AppProvider } from '@/app/AppContext';
import { ClockProvider } from '@/app/ClockContext';
import { SystemMetricsProvider } from '@/app/SystemMetricsContext';
import { defaultTheme } from '@/config/theme';
import '@/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SystemMetricsProvider>
        <AppProvider theme={defaultTheme}>
          <ClockProvider>
            <App />
          </ClockProvider>
        </AppProvider>
      </SystemMetricsProvider>
    </BrowserRouter>
  </StrictMode>,
);
