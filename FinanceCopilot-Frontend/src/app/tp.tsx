'use client'
import React from 'react'
import dataset from './tp.json'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export const Tp = () => {

//   const [data, setdata] = useState<any>(dataset)
//   const [editingId, setEditingId] = useState<number | null>(null)
//   const [editValues, setEditValues] = useState<{name: string, email: string}>({name: '', email: ''})

//   useEffect(() => {
//     setdata(dataset)
//   }, [])

//   const handleDelete = (itemID: number) => {
//     const updatedData = data.filter((item: any) => item.id !== itemID)
//     setdata(updatedData)
//   }

//   const handleEdit = (itemID: number) => {
//     const item = data.find((item: any) => item.id === itemID)
//     if (item) {
//       setEditingId(itemID)
//       setEditValues({ name: item.name, email: item.email })
//     }
//   }
//   const handleSave =(itemId:number)=>{
//     const updatedData = data.map((item:any) => item.id === itemId ? {...item, name: editValues.name, email: editValues.email} : item)
//     setdata(updatedData)
//     setEditingId(null)
//     setEditValues({name: '', email: ''})
//   }
//  const handleCancel = () =>{
//   setEditingId(null)
//   setEditValues({name: '', email: ''})
//  }

//   const handleInputChange = (field: 'name' | 'email', value: string) => {
//     setEditValues(prev => ({ ...prev, [field]: value }))
//   }


//   const [count,setCount] = useState(0)

//   const handleIncrement = ():void => {
//     setCount(count+1)
//   }
//   const handleDecrement = ():void => {
//     setCount(count-1)
//   }

//   const handleProfile = ():void => {
//     alert('Profile clicked!')
//   }
//   return (
//     <div>
//         <h1>Tp</h1>
//         <p>Count: {count}</p>
//         <button onClick={handleIncrement}>+</button>
//         <button onClick={handleDecrement}>-</button>
//         <button 
//           onClick={handleProfile}
//           style={{
//             width: '40px',
//             height: '40px',
//             backgroundColor: '#007bff',
//             color: 'white',
//             border: 'none',
//             borderRadius: '8px',
//             cursor: 'pointer',
//             marginLeft: '10px'
//           }}
//         >
//           👤
//         </button>
//     <div>
//         {data.map((item:any) => (
//             <div key={item.id} style={{border: '1px solid #ccc', padding: '10px', margin: '10px'}}>
//                 {editingId === item.id ? (
//                     <div>
//                         <input 
//                             type="text" 
//                             value={editValues.name}
//                             onChange={(e) => handleInputChange('name', e.target.value)}
//                             placeholder="Name"
//                         />
//                         <input 
//                             type="email" 
//                             value={editValues.email}
//                             onChange={(e) => handleInputChange('email', e.target.value)}
//                             placeholder="Email"
//                         />
//                         <button onClick={() => handleSave(item.id)}>Save</button>
//                         <button onClick={handleCancel}>Cancel</button>
//                     </div>
//                 ) : (
//                     <div>
//                         <h1>{item.name}</h1>
//                         <p>{item.email}</p>
//                         <p><strong>Role:</strong> {item.role}</p>
//                         <p><strong>Location:</strong> {item.location}</p>
//                         <button onClick={() => handleEdit(item.id)}>Edit</button>
//                         <button onClick={() => handleDelete(item.id)}>Delete</button>
                        
//                     </div>
//                 )}
//             </div>
//         ))}
//     </div>
//     </div>
//   )
}

