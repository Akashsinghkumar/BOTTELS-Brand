import React from 'react'
import { useLocation } from './LocationContext'

export default function NavbarLocation(){
  const {location, setModalOpen} = useLocation()
  return (
    <header style={{background:'#fff',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',padding:'12px 20px',position:'sticky',top:0,zIndex:1000}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontWeight:800,color:'#00bcd4'}}>AQUAVIORA</div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{cursor:'pointer'}} onClick={()=>setModalOpen(true)}>
            <span style={{marginRight:8}}>📍</span>
            <span style={{fontWeight:600}}>{location ? `${location.city}${location.state? ', '+location.state:''}` : 'Select delivery location'}</span>
            <div style={{fontSize:12,color:'#666'}}>Change Location</div>
          </div>
        </div>
      </div>
    </header>
  )
}
