import React, { useState, useEffect } from 'react'
import { useLocation } from './LocationContext'
import { toast } from 'react-toastify'

const STORAGE = 'aquaviora_addresses'

export default function AddressManager(){
  const {location} = useLocation()
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState({name:'',mobile:'',address:'',landmark:'',city:'',state:'',pincode:''})

  useEffect(()=>{
    const raw = localStorage.getItem(STORAGE)
    if(raw) try{ setAddresses(JSON.parse(raw)) }catch(e){}
  },[])

  function saveAddresses(list){
    setAddresses(list); localStorage.setItem(STORAGE, JSON.stringify(list))
  }

  function submit(e){
    e.preventDefault()
    const item = {...form}
    const list = [item,...addresses]
    saveAddresses(list)
    toast.success('Address Saved Successfully')
    setForm({name:'',mobile:'',address:'',landmark:'',city:'',state:'',pincode:''})
  }

  return (
    <div style={{marginTop:24}}>
      <h3>Saved Addresses</h3>
      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
        <div>
          {addresses.length===0? <div>No addresses saved</div> : addresses.map((a,i)=> (
            <div key={i} style={{padding:12,border:'1px solid #eee',borderRadius:8,marginBottom:8}}>
              <div style={{fontWeight:700}}>{a.name} - {a.mobile}</div>
              <div style={{color:'#666'}}>{a.address} {a.landmark? ', '+a.landmark:''}</div>
              <div style={{color:'#666'}}>{a.city}{a.state? ', '+a.state:''} - {a.pincode}</div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{background:'#fff',padding:12,borderRadius:8,boxShadow:'0 6px 18px rgba(0,0,0,0.04)'}}>
          <h4>Add Address</h4>
          <input placeholder="Full Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="Mobile" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} required style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="Landmark" value={form.landmark} onChange={e=>setForm({...form,landmark:e.target.value})} style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="City" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="State" value={form.state} onChange={e=>setForm({...form,state:e.target.value})} style={{width:'100%',padding:8,margin:'6px 0'}} />
          <input placeholder="Pincode" value={form.pincode} onChange={e=>setForm({...form,pincode:e.target.value})} style={{width:'100%',padding:8,margin:'6px 0'}} />
          <button className="btn btn-primary" type="submit">Save Address</button>
        </form>
      </div>
    </div>
  )
}
