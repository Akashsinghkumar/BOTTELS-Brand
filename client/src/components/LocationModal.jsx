import React, { useEffect, useState } from 'react'
import { useLocation } from './LocationContext'

const POPULAR = ['Patna','Ranchi','Delhi','Mumbai','Bangalore','Kolkata']

export default function LocationModal(){
  const {modalOpen, setModalOpen, setLocation, recent, detectCurrentLocation} = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useEffect(()=>{ if(!modalOpen) setQuery('') },[modalOpen])

  async function search(q){
    setQuery(q)
    if(!q){ setResults([]); return }
    // if numeric assume pincode -> use nominatim search
    try{
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`)
      const js = await res.json()
      const mapped = js.map(it=>({city:it.address.city||it.address.town||it.address.village||it.address.county||it.display_name, state:it.address.state||'', pincode:it.address.postcode||'', lat:it.lat, lng:it.lon}))
      setResults(mapped)
    }catch(e){ setResults([]) }
  }

  if(!modalOpen) return null

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
      <div style={{width:'min(920px,96%)',background:'#fff',borderRadius:10,padding:20,maxHeight:'85vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>Select Delivery Location</h3>
          <div><button className="btn" onClick={()=>setModalOpen(false)}>Close</button></div>
        </div>

        <div style={{marginTop:12}}>
          <input placeholder="Search City or Pincode" value={query} onChange={e=>search(e.target.value)} style={{width:'100%',padding:12,borderRadius:8,border:'1px solid #ddd'}} />
        </div>

        <div style={{display:'flex',gap:16,marginTop:18}}>
          <div style={{flex:1}}>
            <button className="btn btn-outline" onClick={async()=>{ await detectCurrentLocation() }}>📍 Use Current Location</button>

            <div style={{marginTop:18}}>
              <h4>Recent Locations</h4>
              {recent && recent.length? recent.map((r,i)=> (
                <div key={i} style={{padding:'8px 0',borderBottom:'1px solid #f1f1f1'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>{r.city}{r.state? ', '+r.state:''} {r.pincode? ' - '+r.pincode:''}</div>
                    <div><button className="btn" onClick={()=>setLocation(r)}>Select</button></div>
                  </div>
                </div>
              )) : <div>No recent locations</div>}
            </div>

            <div style={{marginTop:18}}>
              <h4>Popular Locations</h4>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {POPULAR.map(p=> (
                  <button key={p} className="btn" onClick={()=>setLocation({city:p,state:'',pincode:'',lat:'',lng:''})}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{flex:1}}>
            <h4>Search Results</h4>
            {results.length===0 ? <div style={{color:'#666'}}>No search results</div> : results.map((r,idx)=> (
              <div key={idx} style={{padding:'8px 0',borderBottom:'1px solid #f1f1f1'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>{r.city}{r.state? ', '+r.state:''} {r.pincode? '- '+r.pincode:''}</div>
                  <div><button className="btn" onClick={()=>setLocation({city:r.city,state:r.state,pincode:r.pincode,lat:r.lat,lng:r.lng})}>Select</button></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
