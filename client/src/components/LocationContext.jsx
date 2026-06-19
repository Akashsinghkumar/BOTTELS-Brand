import React, { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

const LocationContext = createContext()
const STORAGE_KEY = 'aquaviora_location'
const RECENT_KEY = 'aquaviora_recent_locations'

export function LocationProvider({children}){
  const [location, setLocation] = useState(null)
  const [recent, setRecent] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(raw){
      try{ setLocation(JSON.parse(raw)) }catch(e){}
    }
    const r = localStorage.getItem(RECENT_KEY)
    if(r) try{ setRecent(JSON.parse(r)) }catch(e){}
  },[])

  useEffect(()=>{
    if(location) localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
  },[location])

  function saveRecent(loc){
    const copy = [loc, ...recent.filter(r=>r.city!==loc.city || r.pincode!==loc.pincode)].slice(0,5)
    setRecent(copy)
    localStorage.setItem(RECENT_KEY, JSON.stringify(copy))
  }

  async function setLocationAndNotify(loc){
    setLocation(loc)
    saveRecent(loc)
    toast.success('Location Updated Successfully')
    setModalOpen(false)
  }

  async function detectCurrentLocation(){
    if(!navigator.geolocation){
      toast.error('Geolocation not supported')
      return
    }
    return new Promise((resolve)=>{
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        // Reverse geocode using Nominatim
        try{
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
          const json = await res.json()
          const city = json.address.city || json.address.town || json.address.village || json.address.county || json.address.state_district || json.address.state
          const state = json.address.state || ''
          const pincode = json.address.postcode || ''
          const loc = {city, state, pincode, lat, lng}
          await setLocationAndNotify(loc)
          resolve(loc)
        }catch(e){
          toast.error('Failed to detect location')
          resolve(null)
        }
      }, (err)=>{
        toast.error('Location permission denied')
        resolve(null)
      })
    })
  }

  return (
    <LocationContext.Provider value={{location, setLocation:setLocationAndNotify, recent, modalOpen, setModalOpen, detectCurrentLocation}}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation(){ return useContext(LocationContext) }
