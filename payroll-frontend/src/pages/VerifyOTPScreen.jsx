import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function VerifyOTPScreen() {

  const [otp, setOtp] =
    useState("");

  const navigate =
    useNavigate();

  const email =
    localStorage.getItem(
      "loginEmail"
    );

  const verifyOTP =
    async () => {

      try {

        const response =
          await API.post(
            "/auth/verify-otp",
            {
              email,
              otp,
            }
          );

        localStorage.setItem(
          "user",
          JSON.stringify(
            response.data
          )
        );

        const role =
          response.data.role.toLowerCase();

        if(role === "maker")
          navigate("/maker");

        if(role === "hrbp")
          navigate("/hrbp");

        if(role === "hod")
          navigate("/hod");

        if(role === "payroll")
          navigate("/payroll");

      } catch {

        alert(
          "Invalid OTP"
        );

      }

    };

  return (

    <div className="h-screen flex items-center justify-center">

      <div className="w-[350px] bg-white p-6 rounded-2xl border">

        <h2 className="text-xl font-semibold mb-4">
          Enter OTP
        </h2>

        <input
          placeholder="OTP"
          value={otp}
          onChange={(e)=>
            setOtp(
              e.target.value
            )
          }
          className="w-full border p-3 rounded-xl"
        />

        <button
          onClick={verifyOTP}
          className="mt-4 w-full bg-black text-white h-10 rounded-xl"
        >
          Verify OTP
        </button>

      </div>

    </div>

  );

}