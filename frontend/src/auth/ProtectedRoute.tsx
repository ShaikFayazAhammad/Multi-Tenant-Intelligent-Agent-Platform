import { Navigate, Outlet } from "react-router-dom"
import { getStoredSession } from "../services/apiClient"

export const ProtectedRoute = () => {
  const session = getStoredSession()

  if (!session?.user?.access_token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
