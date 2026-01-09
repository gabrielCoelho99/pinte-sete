import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { NewOrder } from './pages/NewOrder';
import { OrderDetails } from './pages/OrderDetails';
import { Quotes } from './pages/Quotes';
import { NewQuote } from './pages/NewQuote';
import { QuoteDetails } from './pages/QuoteDetails';
import { Finance } from './pages/Finance';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={
              <PrivateRoute adminOnly>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<NewOrder />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="quotes/new" element={<NewQuote />} />
            <Route path="quotes/:id" element={<QuoteDetails />} />
            <Route path="finance" element={
              <PrivateRoute adminOnly>
                <Finance />
              </PrivateRoute>
            } />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
