import React from 'react'
import { ReactNode } from "react";
const layout = ({children}:{children:ReactNode}) => {
  return (
    <div>
        {children}
    </div>
  )
}

export default layout