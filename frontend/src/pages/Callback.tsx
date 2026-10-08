import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

const Callback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    navigate("/login", { replace: true })
  }, [navigate])

  return <div className="flex h-screen items-center justify-center">Redirecting…</div>
}

export default Callback
