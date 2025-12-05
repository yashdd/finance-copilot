'use client'
import React from 'react'
import dataset from './tp.json'
import { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react'

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

//     const [notes,setNotes] = useState<{id:Number, title:string, content:string, }[]>([])
//     const [noteInput,setNoteInput] = useState<string>('')
//     const [title,setTitle] = useState<string>('')
//     const [content,setContent] = useState<string>('')
//     const [editingId,setEditingId] = useState<number | null>(null)
//     const [searchTerm,setSearchTerm] = useState<string>('')

//     const inputFocus = useRef<HTMLInputElement>(null)
//     useEffect(()=>{
//         if (inputFocus.current){
//             inputFocus.current.focus()
//         }
//     }, [notes])

//     const handleSave = () => {
//         if (editingId) {
//             setNotes(notes.map((note) => note.id === editingId ? { id: note.id, title: title, content: content } : note))
//             setTitle('')
//             setContent('')
//             setEditingId(null)
//         } else {
//             if (title.trim() && content.trim()) {
//                 setNotes([...notes, { id: Date.now(), title: title, content: content }])
//                 setTitle('')
//                 setContent('')
//             }
//         }
//     }
//     const handleEdit = (id: number) => {
//         if (notes.find((note) => note.id === id)) {
//             setTitle(notes.find((note) => note.id === id)?.title || '')
//             setContent(notes.find((note) => note.id === id)?.content || '')
//             setEditingId(id)
//         }
//     }
//     useEffect(()=>{
//         const charactercount = content.length
//         console.log(charactercount)
//     }, [content])

//     const filterNotes = useMemo(()=>{
//         console.log('Filtering notes...')
//         return notes.filter((note) => note.title.toLowerCase().includes(searchTerm.toLowerCase()) || note.content.toLowerCase().includes(searchTerm.toLowerCase()))
//     }, [notes, searchTerm])

//     const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchTerm(e.target.value)
//     }

//     const handleDelete = (useCallback((id:number)=>{
//         setNotes(notes.filter((note) => note.id !== id))
//     }, [notes]))

// return (
//     <><div>
//         <h1>Smart Note Taker</h1>
//         <input type="text" placeholder="Search notes..." onChange={handleSearch} value={searchTerm} />
//         <input ref={inputFocus} type = "text" placeholder="Enter title" onChange={(e) => setTitle(e.target.value)} value={title} />
//         <input type="text" placeholder="Enter your note" onChange={(e) => setContent(e.target.value)} value={content} />
//         <button onClick={handleSave}>Save</button>
//             <button onClick={() => handleEdit(editingId as number)}>Edit</button>
//             <button onClick={() => setNoteInput('')}>Cancel</button><div>
//             {notes.map((note) => (
//                 <div key={note.id as number}>
//                     <h2>{note.title}</h2>
//                     <p>{note.content}</p>
//                     <button onClick={() => handleEdit(note.id as number)}>Edit</button>
//                     <button onClick={() => handleDelete(note.id as number)}>Delete</button>
//                 </div>
//             ))}
//             {filterNotes.map((note) => (
//                 <div key={note.id as number}>
//                     <p>Search Term: {searchTerm}</p>
//                     {searchTerm.trim()!== '' ? (
//                         <div>
//                             <h2>{note.title}</h2>
//                             <p>{note.content}</p>
//                             <button onClick={() => handleEdit(note.id as number)}>Edit</button>
//                         </div>
//                     ) : (
//                         <h3>Filtered notes will appear here</h3>
//                     )}
//                 </div>
//             ))}
//         </div></div></>
// )

    interface Action {
        type: 'increment' | 'decrement'
    }

    function countReducer(state: number, action: string): number {
        switch(action){
            case 'increment':
                return state + 1
            case 'decrement':
                return state - 1
            default:
                return state
        }
    }

    const [count, setCount] = useReducer(countReducer, 0)
    const handleIncrement = () => {
        setCount('increment')
        console.log(count)
    }
    const handleDecrement = () => {
        setCount('decrement')
        console.log(count)
    }
    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={handleIncrement}>Increment+</button>
            <button onClick={handleDecrement}>Decrement-</button>
        </div>
    )
}

