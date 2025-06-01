import React from 'react'
import Link from "next/link";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const page = async () => {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // User is logged in, redirect to dashboard
    redirect('/dashboard')
  }
  return (
    <div className='z-10  h-screen'>
      <div className="absolute top-6 right-8 flex gap-6 items-center z-50">
        <Link href="/signup">
          <button className="bg-transparent text-[#18182a] font-semibold text-lg hover:text-[#6c63ff] transition-colors">Sign up</button>
        </Link>
        <Link href="/login">
          <button className="bg-[#18182a]  text-white font-semibold text-lg rounded-full px-8 py-2 shadow-lg hover:bg-[#6c63ff]  transition-colors">Log in</button>
        </Link>
      </div>
      <h1 className='text-black text-center text-6xl font-bold pt-65'>Your story, styled to perfection.</h1>
      <p className='text-gray-500 text-xl font-light text-center pt-3'>Bring your content ideas to life</p>

    </div>
  )
}

export default page