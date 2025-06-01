import React from 'react'

const Background = () => {
  return (
    <div>
      <div className="absolute z-[-1] inset-0  h-full w-full items-center px-5 py-24 [background:radial-gradient(125%_125%_at_50%_90%,#ff7e5f_20%,#3b82f6_50%,#e879f9_80%)]"></div>
      <div
        className="absolute z-1 inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/grain.png)',
          backgroundSize: '100px 100px',
          backgroundRepeat: 'repeat',
          backgroundBlendMode: 'overlay',
          backgroundPosition: 'left top',
          mixBlendMode: 'overlay',
          opacity: 0.6,
        }}
      />
    </div>
  )
}

export default Background