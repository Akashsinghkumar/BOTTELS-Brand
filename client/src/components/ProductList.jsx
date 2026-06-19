import React, { useMemo } from 'react'
import { useLocation } from './LocationContext'
import WAREHOUSES from '../data/warehouses'

const PRODUCTS = [
  { id:'250ml', title:'250ml Mini', availableLocations:['Patna','Ranchi','Delhi'], warehouseHint: 'Patna' },
  { id:'500ml', title:'500ml Standard', availableLocations:['Mumbai','Bangalore','Delhi'], warehouseHint: 'Mumbai' },
  { id:'600ml', title:'600ml Premium', availableLocations:['Patna','Delhi'], warehouseHint: 'Patna' },
  { id:'1L', title:'1 Litre Premium', availableLocations:['Kolkata','Delhi'], warehouseHint: 'Kolkata' },
  { id:'20L', title:'20 Litre Jar', availableLocations:['Patna','Ranchi'], warehouseHint: 'Patna' }
]

function findWarehouseFor(city){
  const found = WAREHOUSES.find(w=> w.city.toLowerCase() === (city||'').toLowerCase())
  return found || WAREHOUSES[0]
}

export default function ProductList(){
  const {location} = useLocation()

  const filtered = useMemo(()=> {
    if(!location) return PRODUCTS.map(p=> ({...p, available:false}))
    return PRODUCTS.map(p=> ({...p, available: p.availableLocations.includes(location.city)}))
  },[location])

  return (
    <div>
      <h2>Products</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
        {filtered.map(p=> (
          <div key={p.id} style={{padding:16,background:'#fff',borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,0.04)'}}>
            <h4>{p.title}</h4>
            <p style={{color:'#666'}}>Ships from {findWarehouseFor(p.warehouseHint).city} Warehouse</p>
            {p.available ? (
              <div>
                <div style={{fontWeight:700}}>Delivering to {location.city}</div>
                <div style={{marginTop:8}}>Estimated Delivery: Today 5 PM - 8 PM</div>
                <div style={{marginTop:8,fontWeight:700}}>Delivery Fee: FREE</div>
                <button className="btn btn-primary" style={{marginTop:12}}>Add to Cart</button>
              </div>
            ) : (
              <div>
                <div style={{color:'#d32f2f',fontWeight:700}}>Currently unavailable in your area</div>
                <button className="btn btn-outline" disabled style={{marginTop:12,opacity:0.6}}>Add to Cart</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
