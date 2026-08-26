'use client'
import { useState } from 'react'
import { NavbarDemo } from '../Components/Navbar/NavbarDemo'
import Link from 'next/link';

const Login = () => {
  const [Selected, isSelected] = useState(false);
  return (
    <div>
      <NavbarDemo />
      <div className='min-h-screen bg-blue-200'>
        <div className='container mx-auto px-4 py-8'>
          <div className='flex items-center justify-between mb-6'>
            <button
              className='flex'
              onClick={() => isSelected(!Selected)}
            >Login</button>
            <div className='card bg-blue-600 shadow-sm mb-4'>
              <div className='card-body'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text font-bold'>Login</span>
                  </label>
                </div>
              </div>
            </div>

            <div className='card bg-blue-600 shadow-sm mb-4'>
              <div className='card-body'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text font-bold'>Registration</span>
                  </label>
                </div>
              </div>
            </div>
            <Link className='card bg-blue-400 shadow-sm mb-4' href={'/home'}>
              <div className='card-body'>
                <div className='form-control'>
                  <label className='label'>
                    <span className='label-text font-bold'>Login</span>
                  </label>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>

  )
}

export default Login