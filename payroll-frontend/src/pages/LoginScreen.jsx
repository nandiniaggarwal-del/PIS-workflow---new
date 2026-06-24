import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function LoginScreen() {

  const [email, setEmail] =
    useState("");

  const navigate =
    useNavigate();

  const login = async () => {

    try {

      const response = await API.post(
        "/auth/sso-login",
        { email }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data)
      );

      const role = response.data.role.toLowerCase();

      if (role === "maker") navigate("/maker");
      if (role === "hrbp") navigate("/hrbp");
      if (role === "hod") navigate("/hod");
      if (role === "payroll") navigate("/payroll");
      if (role === "admin") navigate("/admin");

    } catch {

      alert("Invalid User");

    }
  };

  return (
    <div className="h-screen flex items-center justify-center">

      <div className="w-[350px] bg-white p-6 rounded-2xl border">

        <h2 className="text-xl font-semibold mb-4">
          Payroll Workflow Login
        </h2>

        <input
          placeholder="Company Email"
          value={email}
          onChange={(e)=>
            setEmail(
              e.target.value
            )
          }
          className="w-full border p-3 rounded-xl"
        />

        <button
          onClick={login}
          className="mt-4 w-full bg-black text-white h-10 rounded-xl"
        >
          Login
        </button>

      </div>

    </div>
  );
}