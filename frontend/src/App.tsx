import { useMemo, useState } from 'react'
import './App.css'
import { useSession } from './auth/useSession'
import { Login } from './auth/Login'
import { RequireRole } from './auth/RequireRole'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/ToastProvider'
import { visibleNavItems } from './navigation/navigation'
import { UsersPage } from './features/users/UsersPage'
import { CategoriesPage } from './features/categories/CategoriesPage'
import { SuppliersPage } from './features/suppliers/SuppliersPage'
import { ProductsPage } from './features/products/ProductsPage'
import { StockPage } from './features/stock/StockPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { RestockPage } from './features/restock/RestockPage'
import { PurchaseOrdersPage } from './features/purchase-orders/PurchaseOrdersPage'
import { UiShowcasePage } from './features/ui-showcase/UiShowcasePage'
import { ChatWidget } from './features/chatbot/ChatWidget'
import { ChatLauncherProvider } from './features/chatbot/ChatLauncherContext'

type AdminView =
  | 'dashboard'
  | 'users'
  | 'categories'
  | 'suppliers'
  | 'products'
  | 'stock'
  | 'restock'
  | 'purchase-orders'
  | 'ui-showcase'

function App() {
  const { user, logout } = useSession()
  const [view, setView] = useState<AdminView>('dashboard')

  const navItems = useMemo(() => (user ? visibleNavItems(user.role) : []), [user])

  if (!user) {
    return <Login />
  }

  return (
    <ToastProvider>
      <ChatLauncherProvider>
        <AppShell
          navItems={navItems}
          activeId={view}
          onNavigate={(id) => setView(id as AdminView)}
          user={{ name: user.name, role: user.role }}
          onLogout={() => void logout()}
        >
          <RequireRole role="ADMIN">
            {view === 'users' && <UsersPage />}
            {view === 'categories' && <CategoriesPage />}
            {view === 'suppliers' && <SuppliersPage />}
            {view === 'products' && <ProductsPage />}
          </RequireRole>
          <RequireRole role={['ADMIN', 'OPERARIO']}>
            {view === 'dashboard' && <DashboardPage />}
            {view === 'stock' && <StockPage />}
            {view === 'restock' && (
              <RestockPage onNavigateToPurchaseOrders={() => setView('purchase-orders')} />
            )}
            {view === 'purchase-orders' && <PurchaseOrdersPage />}
            {view === 'ui-showcase' && <UiShowcasePage />}
          </RequireRole>
        </AppShell>

        <ChatWidget />
      </ChatLauncherProvider>
    </ToastProvider>
  )
}

export default App
