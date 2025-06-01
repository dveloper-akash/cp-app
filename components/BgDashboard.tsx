import React from 'react'

const BgDashboard = () => {
  return (
    <div>
      <div className="absolute z-[-1] inset-0 h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_90%,#fff7e6_15%,#fca652_40%,#1a1a1a_90%)]"></div>

      <div
        className="absolute z-1 inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/grain.png)',
          backgroundSize: '100px 100px',
          backgroundRepeat: 'repeat',
          backgroundBlendMode: 'overlay',
          backgroundPosition: 'left top',
          mixBlendMode: 'overlay',
          opacity: 0.5,
        }}
      />
    </div>
  )
}
export default BgDashboard
