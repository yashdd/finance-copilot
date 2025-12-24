'use client'
import React from 'react'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'


export const Todo = () => {

    const [todos, setTodos] = useState<{id: number, task: string, status: string}[]>([])
    const [newTodo, setNewTodo] = useState<{task: string, status: string}>({task: '', status: ''})
    const [complete, setComplete] = useState<boolean>(false)
    const [newTodoId, setNewTodoId] = useState<number>(0)
    const addTodo = (task: string, status: string) =>{

        setNewTodo({task, status})
        setTodos([...todos, {id: Date.now(), task, status}])
        console.log(todos)
        console.log(newTodo)
    
    }

    const deleteTodo = ((id: number) =>{
        const updatedTodos = todos.filter((todo) => todo.id!==id)
        setTodos(updatedTodos)
    })
    
    const completeTodo = ((id: number) =>{
        const updatedTodos = todos.map((todo) => todo.id===id ? {...todo, status: 'completed'} : todo)
        setTodos(updatedTodos)
    })
    useEffect(() => {
        const saveTodo = localStorage.getItem('todos')
        if (saveTodo){
            setTodos(JSON.parse(saveTodo))
        }else{
            setTodos([])
        }
    }, [])

    useEffect(()=>{
        localStorage.setItem('todos', JSON.stringify(todos))
        console.log("Saved to localStorage")
    }, [todos])

    const inputFocus = useRef<HTMLInputElement>(null)
    useEffect(()=>{
        if (inputFocus.current){
            inputFocus.current.focus()
        }
    }, [todos])
    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Todo</h2>
            
            <div className="space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                        ref={inputFocus}
                        type="text" 
                        value={newTodo.task} 
                        onChange={(e) => setNewTodo({...newTodo, task: e.target.value})} 
                        placeholder="Enter task..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500"
                    />
                    <button 
                        onClick={() => addTodo(newTodo.task, newTodo.status)} 
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                        Add Todo
                    </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="text" 
                        value={newTodo.status} 
                        onChange={(e) => setNewTodo({...newTodo, status: e.target.value})} 
                        placeholder="Status (optional)"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-500"
                    />
                    
                </div>
            </div>
            <div className="flex flex-col gap-3">
                {todos.map((todo) => (
                    <div 
                        key={todo.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                        <div className="mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                                {todo.task}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Status: <span className="font-medium">{todo.status}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => completeTodo(todo.id)} 
                                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Complete Todo
                            </button> 
                            <button 
                                onClick={() => deleteTodo(todo.id)} 
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                Delete Todo
                            </button>
                        </div>
                    </div>
                ))}
            </div>
           
        </div>
    )
}