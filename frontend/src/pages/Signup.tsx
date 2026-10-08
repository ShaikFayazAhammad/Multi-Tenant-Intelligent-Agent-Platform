import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../services/apiClient";

// UI design with glassmorphism and gradient background
const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    employeeId: "",
    department: "",
    role: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async () => {
    // Basic validation
    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await registerUser({
        full_name: form.fullName,
        email: form.email,
        password: form.password,
        employee_id: form.employeeId,
        department: form.department,
        role: form.role,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (e: any) {
      setError(e.message || "Signup failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-white/10 p-8 backdrop-blur-lg shadow-2xl">
        <h2 className="text-center text-3xl font-bold text-white">Create Your BFSI Platform Account</h2>
        {error && (
          <div className="rounded bg-red-500/20 p-3 text-sm text-red-100">{error}</div>
        )}
        {success && (
          <div className="rounded bg-green-500/20 p-3 text-sm text-green-100">
            Account created! Redirecting to login…
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          <input
            placeholder="Full Name"
            value={form.fullName}
            onChange={e => setForm({ ...form, fullName: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={e => setForm({ ...form, employeeId: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
          <input
            placeholder="Role"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            className="rounded bg-white/20 p-3 text-white placeholder-gray-200 outline-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="mt-4 w-full rounded bg-white/30 px-4 py-2 font-semibold text-white transition hover:bg-white/50"
        >
          Sign Up
        </button>
        <p className="mt-4 text-center text-sm text-white">
          Already have an account?{' '}<span className="cursor-pointer font-medium underline" onClick={() => navigate('/login')}>Login</span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
