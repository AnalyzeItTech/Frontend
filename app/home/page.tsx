'use client'
import { IconArrowRight } from "@tabler/icons-react"
import { NavbarDemo } from "../Components/Navbar/NavbarDemo"
import { RequireAuth } from "../Components/app/RequireAuth"
import api from "../lib/axios"
import { useState } from "react"

const Home = () => {
  const [reply, setReply] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const res = await api.post("/res", { message });
      setReply(typeof res.data === "string" ? res.data : res.data?.message ?? "");
      setMessage("");
    } catch (error) {
      console.error("Error getting reply", error);
    }
  }

  return (
    <RequireAuth>
    <div>
      <NavbarDemo />
      {/* Reply */}
      <div className='card bg-blue-400 shadow-sm mb-4 ml-50 mr-50 h-100'>
        <div className='card-body'>
          <div className='form-control'>
            <label className='label'>
              <span className='label-text font-bold'>
                <h3>{reply}</h3>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className='card bg-blue-600 shadow-sm mb-4 ml-50 mr-50'>
        <div className='card-body'>
          <div className='form-control w-full'>
            <form onSubmit={handleSubmit} className='flex items-center gap-2 w-full'>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className='flex-1 p-2 border rounded'
              />
              <button type="submit" className='p-2 text-white'>
                <IconArrowRight />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
    </RequireAuth>
  )
}

export default Home